<?php

namespace Tests\Feature;

use App\Data\Money;
use App\Data\PricingContext;
use App\Enums\CartStatus;
use App\Enums\DiscountType;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use App\Services\PricingService;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PricingPhaseSevenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_vnd_rounding_is_half_up(): void
    {
        $this->assertSame(10001, (new Money(100005))->percentage(10)->amount);
        $this->assertSame(10000, (new Money(100004))->percentage(10)->amount);
    }

    public function test_quote_applies_scoped_promotion_coupon_shipping_and_installation(): void
    {
        [$cart, $product] = $this->cart(10000000, true);
        $promotion = Promotion::factory()->create(['type' => DiscountType::Percentage, 'value' => 10, 'maximum_discount' => 500000]);
        $promotion->categories()->attach($product->category_id);
        Coupon::factory()->create(['code' => 'GIAM100', 'value' => 100000, 'minimum_order' => 1000000]);
        $quote = app(PricingService::class)->quote($cart, new PricingContext(couponCode: 'giam100', shippingCity: 'Thành phố Hồ Chí Minh'));
        $this->assertSame(10000000, $quote->subtotal);
        $this->assertSame(500000, $quote->promotionDiscount);
        $this->assertSame(100000, $quote->couponDiscount);
        $this->assertSame(0, $quote->shippingTotal);
        $this->assertSame(350000, $quote->installationTotal);
        $this->assertSame(9750000, $quote->grandTotal);
    }

    public function test_non_stackable_promotion_is_exclusive_and_highest_priority_wins(): void
    {
        [$cart, $product] = $this->cart(1000000);
        $stackable = Promotion::factory()->create(['name' => 'Stack 50', 'value' => 50, 'priority' => 100, 'is_stackable' => true, 'maximum_discount' => null]);
        $exclusiveLow = Promotion::factory()->create(['name' => 'Exclusive 10', 'value' => 10, 'priority' => 5, 'is_stackable' => false, 'maximum_discount' => null]);
        $exclusiveHigh = Promotion::factory()->create(['name' => 'Exclusive 20', 'value' => 20, 'priority' => 10, 'is_stackable' => false, 'maximum_discount' => null]);
        foreach ([$stackable, $exclusiveLow, $exclusiveHigh] as $promotion) {
            $promotion->products()->attach($product);
        }
        $quote = app(PricingService::class)->quote($cart);
        $this->assertSame(200000, $quote->promotionDiscount);
        $this->assertSame('Exclusive 20', $quote->lines[0]['promotions'][0]['name']);
    }

    public function test_stackable_promotions_apply_sequentially_without_negative_total(): void
    {
        [$cart, $product] = $this->cart(1000000);
        foreach ([10, 20] as $priority => $value) {
            $promotion = Promotion::factory()->create(['value' => $value, 'priority' => $priority, 'is_stackable' => true, 'maximum_discount' => null]);
            $promotion->products()->attach($product);
        }
        $quote = app(PricingService::class)->quote($cart);
        $this->assertSame(280000, $quote->promotionDiscount);
        $this->assertSame(720000, $quote->grandTotal);
    }

    public function test_coupon_validates_window_minimum_global_and_per_user_limits(): void
    {
        [$cart] = $this->cart(2000000);
        $user = User::factory()->create();
        $coupon = Coupon::factory()->create(['code' => 'LIMITED', 'minimum_order' => 3000000]);
        $this->expectValidation(fn () => app(PricingService::class)->quote($cart, new PricingContext($user, $coupon->code)), 'coupon_code');
        $coupon->update(['minimum_order' => 0, 'usage_limit' => 1, 'used_count' => 1]);
        $this->expectValidation(fn () => app(PricingService::class)->quote($cart, new PricingContext($user, $coupon->code)), 'coupon_code');
        $coupon->update(['usage_limit' => 10, 'used_count' => 0, 'ends_at' => now()->subMinute()]);
        $this->expectValidation(fn () => app(PricingService::class)->quote($cart, new PricingContext($user, $coupon->code)), 'coupon_code');
        $coupon->update(['ends_at' => now()->addDay(), 'per_user_limit' => 1]);
        $order = Order::factory()->create(['user_id' => $user->id, 'coupon_id' => $coupon->id]);
        $coupon->redemptions()->create(['user_id' => $user->id, 'order_id' => $order->id, 'discount_amount' => 100000]);
        $this->expectValidation(fn () => app(PricingService::class)->quote($cart, new PricingContext($user, $coupon->code)), 'coupon_code');
    }

    public function test_shipping_quote_requires_city_and_uses_local_or_nationwide_rule(): void
    {
        [$cart] = $this->cart(1000000);
        $pricing = app(PricingService::class);
        $this->assertTrue($pricing->quote($cart)->shippingAddressRequired);
        $this->assertSame(50000, $pricing->quote($cart, new PricingContext(shippingCity: 'Hà Nội'))->shippingTotal);
        $this->assertSame(90000, $pricing->quote($cart, new PricingContext(shippingCity: 'Đà Nẵng'))->shippingTotal);
    }

    public function test_checkout_validation_recalculates_and_ignores_submitted_totals(): void
    {
        [$cart, $product] = $this->cart(1000000);
        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/api/v1/checkout/validate', ['shipping_city' => 'Hà Nội', 'subtotal' => 1, 'grand_total' => 1], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('quote.subtotal', 1000000)->assertJsonPath('quote.shippingTotal', 50000)->assertJsonPath('quote.grandTotal', 1050000);
        $this->assertSame(1000000, (int) $product->fresh()->currentPrice());
    }

    private function cart(int $price, bool $installation = false): array
    {
        $product = Product::whereHas('category', fn ($query) => $query->where('slug', 'dieu-hoa'))->where('status', 'active')->firstOrFail();
        $product->update(['price' => $price, 'sale_price' => null, 'stock' => 10, 'is_available' => true, 'btu' => 12000]);
        $cart = Cart::create(['guest_token' => fake()->uuid(), 'status' => CartStatus::Active]);
        $cart->items()->create(['product_id' => $product->id, 'quantity' => 1, 'installation_required' => $installation]);

        return [$cart, $product];
    }

    private function expectValidation(callable $callback, string $key): void
    {
        try {
            $callback();
            $this->fail('Expected validation exception.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey($key, $exception->errors());
        }
    }
}
