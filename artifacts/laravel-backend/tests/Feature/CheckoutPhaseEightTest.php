<?php

namespace Tests\Feature;

use App\Enums\CartStatus;
use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Models\Address;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderStatusService;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CheckoutPhaseEightTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_guest_checkout_is_transactional_and_uses_server_totals(): void
    {
        [$cart, $product] = $this->cart(2000000, 2, true);
        $stock = $product->stock;
        $key = (string) Str::uuid();

        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/thanh-toan', [...$this->payload($key), 'grand_total' => 1])
            ->assertRedirect();

        $order = Order::with(['items.installation', 'payments', 'shipments'])->sole();
        $this->assertSame(4000000, (int) $order->subtotal);
        $this->assertSame(4750000, (int) $order->grand_total);
        $this->assertSame(2, $order->items->first()->quantity);
        $this->assertNotNull($order->items->first()->installation);
        $this->assertSame('pending', $order->payments->first()->status->value);
        $this->assertSame('pending', $order->shipments->first()->status->value);
        $this->assertSame($stock - 2, $product->fresh()->stock);
        $this->assertSame(CartStatus::Converted, $cart->fresh()->status);
    }

    public function test_duplicate_submit_returns_same_order_without_double_decrement(): void
    {
        [$cart, $product] = $this->cart(1000000);
        $stock = $product->stock;
        $key = (string) Str::uuid();
        $client = $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token);

        $client->post('/thanh-toan', $this->payload($key))->assertRedirect();
        $client->post('/thanh-toan', $this->payload($key))->assertRedirect();

        $this->assertSame(1, Order::count());
        $this->assertSame($stock - 1, $product->fresh()->stock);
    }

    public function test_insufficient_stock_rolls_back_every_side_effect(): void
    {
        [$cart, $product] = $this->cart(1000000);
        $product->update(['stock' => 0]);

        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/thanh-toan', $this->payload((string) Str::uuid()))
            ->assertSessionHasErrors('cart');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('payments', 0);
        $this->assertSame(CartStatus::Active, $cart->fresh()->status);
    }

    public function test_coupon_is_consumed_once_and_exhaustion_blocks_next_order(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'ONLYONE', 'type' => DiscountType::Fixed, 'value' => 100000, 'minimum_order' => 0, 'usage_limit' => 1, 'used_count' => 0]);
        [$firstCart] = $this->cart(1000000);
        $this->withSession(['cart.coupon_code' => $coupon->code])->withCookie(config('commerce.guest_cart_cookie'), $firstCart->guest_token)
            ->post('/thanh-toan', $this->payload((string) Str::uuid()))->assertRedirect();
        $this->assertSame(1, $coupon->fresh()->used_count);
        $this->assertDatabaseCount('coupon_redemptions', 1);

        [$secondCart] = $this->cart(1000000);
        $this->withSession(['cart.coupon_code' => $coupon->code])->withCookie(config('commerce.guest_cart_cookie'), $secondCart->guest_token)
            ->post('/thanh-toan', $this->payload((string) Str::uuid()))->assertSessionHasErrors('coupon_code');
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_cancel_releases_stock_and_coupon_exactly_once(): void
    {
        $coupon = Coupon::factory()->create(['code' => 'RESTORE', 'minimum_order' => 0]);
        [$cart, $product] = $this->cart(1000000);
        $initialStock = $product->stock;
        $this->withSession(['cart.coupon_code' => $coupon->code])->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/thanh-toan', $this->payload((string) Str::uuid()));
        $order = Order::sole();

        app(OrderStatusService::class)->transition($order, OrderStatus::Cancelled);

        $this->assertSame($initialStock, $product->fresh()->stock);
        $this->assertSame(0, $coupon->fresh()->used_count);
        $this->assertDatabaseCount('coupon_redemptions', 0);
        $this->assertNotNull($order->fresh()->stock_released_at);
        $this->expectException(ValidationException::class);
        app(OrderStatusService::class)->transition($order->fresh(), OrderStatus::Failed);
    }

    public function test_order_access_is_scoped_to_owner_or_guest_session(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$cart] = $this->cart(1000000, user: $owner);
        $address = Address::factory()->for($owner)->create();
        $this->actingAs($owner)->post('/thanh-toan', [...$this->payload((string) Str::uuid()), 'address_id' => $address->id])->assertRedirect();
        $order = Order::sole();

        $this->actingAs($owner)->get(route('orders.show', $order))->assertOk();
        $this->actingAs($other)->get(route('orders.show', $order))->assertForbidden();
    }

    private function cart(int $price, int $quantity = 1, bool $installation = false, ?User $user = null): array
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $product->update(['price' => $price, 'sale_price' => null, 'stock' => 10, 'is_available' => true, 'btu' => 12000]);
        $cart = Cart::create(['user_id' => $user?->id, 'guest_token' => $user ? null : fake()->uuid(), 'status' => CartStatus::Active]);
        $cart->items()->create(['product_id' => $product->id, 'quantity' => $quantity, 'installation_required' => $installation]);

        return [$cart, $product];
    }

    private function payload(string $key): array
    {
        return [
            'idempotency_key' => $key,
            'customer_name' => 'Nguyễn Văn A',
            'customer_phone' => '0901234567',
            'customer_email' => 'customer@example.com',
            'shipping_street' => '123 Nguyễn Huệ',
            'shipping_ward' => 'Phường Bến Nghé',
            'shipping_district' => 'Quận 1',
            'shipping_city' => 'Thành phố Hồ Chí Minh',
            'payment_method' => 'cod',
        ];
    }
}
