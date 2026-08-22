<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Installation;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Review;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoCommerceSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }
        $customer = User::updateOrCreate(['email' => 'customer@dienmay365.test'], ['name' => 'Khách hàng Demo', 'phone' => '0900000365', 'password' => Hash::make(env('DEMO_CUSTOMER_PASSWORD', 'ChangeMe123!')), 'role' => 'customer', 'email_verified_at' => now()]);
        $address = Address::updateOrCreate(['user_id' => $customer->id, 'label' => 'Nhà riêng'], ['recipient_name' => $customer->name, 'phone' => $customer->phone, 'street' => '365 Nguyễn Văn Linh', 'ward' => 'Phường Tân Phong', 'district' => 'Quận 7', 'city' => 'TP. Hồ Chí Minh', 'is_default' => true]);
        $products = Product::query()->where('status', 'active')->orderBy('id')->take(3)->get();
        if ($products->isEmpty()) {
            return;
        }
        $cart = Cart::updateOrCreate(['user_id' => $customer->id, 'status' => 'active'], ['expires_at' => now()->addMonth()]);
        foreach ($products->take(2) as $i => $product) {
            $cart->items()->updateOrCreate(['product_id' => $product->id, 'installation_required' => $i === 0], ['quantity' => 1, 'installation_notes' => $i === 0 ? 'Khảo sát vị trí trước khi lắp đặt' : null]);
        }
        foreach ($products->take(2) as $product) {
            Wishlist::updateOrCreate(['user_id' => $customer->id, 'product_id' => $product->id]);
        }
        Review::updateOrCreate(['user_id' => $customer->id, 'product_id' => $products->first()->id], ['reviewer_name' => $customer->name, 'reviewer_email' => $customer->email, 'rating' => 5, 'title' => 'Đánh giá demo đang chờ duyệt', 'content' => 'Dữ liệu minh họa quy trình kiểm duyệt; không được hiển thị công khai hoặc đưa vào structured data.', 'status' => 'pending']);

        $product = $products->first();
        $unit = (int) $product->currentPrice();
        $coupon = Coupon::where('code', 'DIENMAY100')->first();
        $order = Order::updateOrCreate(['number' => 'DM365-DEMO-0001'], ['idempotency_key' => '00000000-0000-4000-8000-000000000001', 'user_id' => $customer->id, 'address_id' => $address->id, 'coupon_id' => $coupon?->id, 'status' => 'delivered', 'currency' => 'VND', 'subtotal' => $unit, 'discount_total' => 100000, 'shipping_total' => 0, 'installation_total' => 350000, 'grand_total' => $unit + 250000, 'customer_name' => $customer->name, 'customer_phone' => $customer->phone, 'customer_email' => $customer->email, 'shipping_street' => $address->street, 'shipping_ward' => $address->ward, 'shipping_district' => $address->district, 'shipping_city' => $address->city, 'notes' => 'Đơn hàng minh họa cho môi trường local.', 'placed_at' => now()->subDays(7)]);
        $item = $order->items()->updateOrCreate(['sku' => $product->sku], ['product_id' => $product->id, 'product_name' => $product->name, 'product_snapshot' => ['name' => $product->name, 'sku' => $product->sku], 'unit_price' => $unit, 'quantity' => 1, 'discount_total' => 100000, 'line_total' => $unit - 100000, 'installation_required' => true, 'installation_fee' => 350000, 'installation_notes' => 'Lắp đặt tiêu chuẩn']);
        Payment::updateOrCreate(['transaction_id' => 'DEMO-PAY-0001'], ['order_id' => $order->id, 'provider' => 'manual', 'method' => 'cod', 'status' => 'paid', 'currency' => 'VND', 'amount' => $order->grand_total, 'payload' => ['environment' => 'demo'], 'paid_at' => now()->subDays(6), 'provider_synced_at' => now()->subDays(6)]);
        Shipment::updateOrCreate(['tracking_number' => 'DEMO-SHIP-0001'], ['order_id' => $order->id, 'provider' => 'manual', 'carrier' => 'Giao hàng nội bộ', 'status' => 'delivered', 'payload' => ['environment' => 'demo'], 'shipped_at' => now()->subDays(5), 'delivered_at' => now()->subDays(4), 'provider_synced_at' => now()->subDays(4)]);
        Installation::updateOrCreate(['order_item_id' => $item->id], ['fee' => 350000, 'notes' => 'Đã hoàn tất lắp đặt mẫu.', 'status' => 'completed', 'scheduled_at' => now()->subDays(4), 'completed_at' => now()->subDays(4)]);
        if ($coupon) {
            CouponRedemption::updateOrCreate(['coupon_id' => $coupon->id, 'order_id' => $order->id], ['user_id' => $customer->id, 'discount_amount' => 100000]);
        }
    }
}
