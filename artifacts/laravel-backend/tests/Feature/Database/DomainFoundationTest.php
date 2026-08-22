<?php

namespace Tests\Feature\Database;

use App\Enums\CartStatus;
use App\Enums\InstallationStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ShipmentStatus;
use App\Models\Address;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Installation;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DomainFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_commerce_schema_contains_required_snapshot_and_integrity_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('orders', ['idempotency_key', 'coupon_id', 'currency', 'shipping_street', 'shipping_city', 'placed_at']));
        $this->assertTrue(Schema::hasColumns('order_items', ['product_snapshot', 'discount_total', 'installation_fee', 'installation_notes']));
        $this->assertTrue(Schema::hasColumns('coupons', ['maximum_discount', 'per_user_limit', 'used_count']));
        $this->assertTrue(Schema::hasColumns('reviews', ['reviewer_name', 'reviewer_email', 'approved_at']));
        $this->assertTrue(Schema::hasTable('coupon_redemptions'));
        $this->assertTrue(Schema::hasTable('promotion_product'));
        $this->assertTrue(Schema::hasTable('promotion_category'));
        $this->assertTrue(Schema::hasTable('promotion_brand'));
    }

    public function test_cart_allows_separate_installation_variants_and_casts_status(): void
    {
        $this->seed();
        $cart = Cart::factory()->create();
        $product = Product::firstOrFail();

        $cart->items()->create(['product_id' => $product->id, 'quantity' => 1, 'installation_required' => false]);
        $cart->items()->create(['product_id' => $product->id, 'quantity' => 1, 'installation_required' => true]);

        $this->assertCount(2, $cart->fresh()->items);
        $this->assertSame(CartStatus::Active, $cart->fresh()->status);
    }

    public function test_duplicate_cart_variant_is_rejected_by_database(): void
    {
        $this->seed();
        $cart = Cart::factory()->create();
        $product = Product::firstOrFail();
        $attributes = ['product_id' => $product->id, 'quantity' => 1, 'installation_required' => false];
        $cart->items()->create($attributes);

        $this->expectException(QueryException::class);
        $cart->items()->create($attributes);
    }

    public function test_order_keeps_commercial_snapshots_and_exposes_typed_relations(): void
    {
        $this->seed();
        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create();
        $product = Product::firstOrFail();
        $coupon = Coupon::factory()->create();
        $order = Order::factory()->forAddress($address)->create(['coupon_id' => $coupon->id]);
        $item = $order->items()->create([
            'product_id' => $product->id,
            'sku' => $product->sku,
            'product_name' => $product->name,
            'product_snapshot' => ['slug' => $product->slug, 'brand' => $product->brand->name],
            'unit_price' => 12990000,
            'quantity' => 1,
            'discount_total' => 100000,
            'line_total' => 12890000,
            'installation_required' => true,
            'installation_fee' => 300000,
        ]);
        Installation::create(['order_item_id' => $item->id, 'fee' => 300000, 'status' => InstallationStatus::Pending]);
        Payment::create(['order_id' => $order->id, 'provider' => 'cod', 'status' => PaymentStatus::Pending, 'currency' => 'VND', 'amount' => $order->grand_total]);
        Shipment::create(['order_id' => $order->id, 'status' => ShipmentStatus::Pending]);
        $coupon->redemptions()->create(['user_id' => $user->id, 'order_id' => $order->id, 'discount_amount' => 100000]);

        $fresh = $order->fresh(['items.installation', 'payments', 'shipments', 'couponRedemptions']);
        $this->assertSame(OrderStatus::Pending, $fresh->status);
        $this->assertSame($product->slug, $fresh->items->first()->product_snapshot['slug']);
        $this->assertSame(InstallationStatus::Pending, $fresh->items->first()->installation->status);
        $this->assertSame(PaymentStatus::Pending, $fresh->payments->first()->status);
        $this->assertSame(ShipmentStatus::Pending, $fresh->shipments->first()->status);
        $this->assertCount(1, $fresh->couponRedemptions);
    }

    public function test_order_children_are_deleted_with_order(): void
    {
        $order = Order::factory()->create();
        Payment::create(['order_id' => $order->id, 'provider' => 'cod', 'status' => PaymentStatus::Pending, 'currency' => 'VND', 'amount' => 1000000]);
        Shipment::create(['order_id' => $order->id, 'status' => ShipmentStatus::Pending]);

        $order->forceDelete();

        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('shipments', 0);
    }
}
