<?php

namespace Database\Seeders;

use App\Models\CustomerRequest;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Review;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DashboardDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $customer = User::where('email', 'customer@dienmay365.test')->first();
        $products = Product::query()->where('status', 'active')->with(['category', 'brand'])->get();

        if (! $customer || $products->isEmpty()) {
            return;
        }

        $customers = collect([$customer]);
        foreach (range(1, 18) as $index) {
            $customers->push(User::updateOrCreate(
                ['email' => sprintf('demo.customer%02d@dienmay365.test', $index)],
                [
                    'name' => sprintf('Khách hàng Demo %02d', $index),
                    'phone' => sprintf('0912%06d', $index),
                    'password' => Hash::make(env('DEMO_CUSTOMER_PASSWORD', 'ChangeMe123!')),
                    'role' => 'customer',
                    'email_verified_at' => now()->subDays(40 - $index),
                    'created_at' => now()->subDays(40 - $index),
                ],
            ));
        }

        $statuses = ['delivered', 'delivered', 'delivered', 'shipping', 'processing', 'confirmed', 'pending', 'cancelled'];
        foreach (range(1, 36) as $index) {
            $orderCustomer = $customers[($index - 1) % $customers->count()];
            $product = $products[($index - 1) % $products->count()];
            $quantity = ($index % 3) + 1;
            $unitPrice = (int) $product->currentPrice();
            $placedAt = now()->subDays(36 - $index)->setTime(8 + ($index % 10), ($index * 7) % 60);
            $status = $statuses[$index % count($statuses)];
            $order = Order::updateOrCreate(['number' => sprintf('DM365-DASH-%04d', $index)], [
                'idempotency_key' => sprintf('10000000-0000-4000-8000-%012d', $index),
                'user_id' => $orderCustomer->id,
                'status' => $status,
                'currency' => 'VND',
                'subtotal' => $unitPrice * $quantity,
                'discount_total' => $index % 4 === 0 ? 100000 : 0,
                'shipping_total' => 0,
                'installation_total' => $product->category?->slug === 'dieu-hoa' ? 350000 : 0,
                'grand_total' => ($unitPrice * $quantity) - ($index % 4 === 0 ? 100000 : 0) + ($product->category?->slug === 'dieu-hoa' ? 350000 : 0),
                'customer_name' => $orderCustomer->name,
                'customer_phone' => $orderCustomer->phone,
                'customer_email' => $orderCustomer->email,
                'shipping_street' => '365 Nguyễn Văn Linh',
                'shipping_ward' => 'Phường Tân Phong',
                'shipping_district' => 'Quận 7',
                'shipping_city' => 'TP. Hồ Chí Minh',
                'notes' => 'Dữ liệu dashboard local.',
                'placed_at' => $placedAt,
            ]);
            $order->items()->updateOrCreate(['sku' => $product->sku], [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_snapshot' => ['name' => $product->name, 'sku' => $product->sku, 'brand' => $product->brand?->name, 'category' => $product->category?->name],
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'discount_total' => $index % 4 === 0 ? 100000 : 0,
                'line_total' => ($unitPrice * $quantity) - ($index % 4 === 0 ? 100000 : 0),
                'installation_required' => $product->category?->slug === 'dieu-hoa',
                'installation_fee' => $product->category?->slug === 'dieu-hoa' ? 350000 : 0,
            ]);

            if ($status === 'delivered') {
                Payment::updateOrCreate(['transaction_id' => sprintf('DASH-PAY-%04d', $index)], [
                    'order_id' => $order->id, 'provider' => 'demo', 'method' => 'cod', 'status' => 'paid',
                    'currency' => 'VND', 'amount' => $order->grand_total, 'payload' => ['environment' => 'local'],
                    'paid_at' => $placedAt->addDay(), 'provider_synced_at' => $placedAt->addDay(),
                ]);
                Shipment::updateOrCreate(['tracking_number' => sprintf('DASH-SHIP-%04d', $index)], [
                    'order_id' => $order->id, 'provider' => 'demo', 'carrier' => 'Giao hàng Điện Máy 365',
                    'status' => 'delivered', 'payload' => ['environment' => 'local'], 'shipped_at' => $placedAt->addDay(),
                    'delivered_at' => $placedAt->addDays(2), 'provider_synced_at' => $placedAt->addDays(2),
                ]);
            }
        }

        foreach ($customers->take(12) as $index => $reviewCustomer) {
            $product = $products[$index % $products->count()];
            $verifiedOrder = Order::query()->where('user_id', $reviewCustomer->id)->where('status', 'delivered')->first();
            Review::updateOrCreate(['product_id' => $product->id, 'user_id' => $reviewCustomer->id], [
                'verified_order_id' => $verifiedOrder?->id,
                'reviewer_name' => $reviewCustomer->name,
                'reviewer_email' => $reviewCustomer->email,
                'rating' => $index % 4 === 0 ? 4 : 5,
                'title' => 'Đánh giá sản phẩm từ dữ liệu local',
                'content' => 'Dữ liệu minh họa dành riêng cho môi trường phát triển dashboard.',
                'status' => 'approved',
                'verified_at' => $verifiedOrder ? now()->subDays(3) : null,
                'approved_at' => now()->subDays(2),
            ]);
        }

        CustomerRequest::updateOrCreate(['phone' => '0901111222', 'subject' => 'Tư vấn điều hòa phòng 20m²'], ['user_id' => $customer->id, 'type' => 'callback', 'status' => 'new', 'name' => 'Nguyễn Minh Anh', 'email' => 'minhanh@example.test', 'message' => 'Vui lòng gọi lại sau 18 giờ.']);
        CustomerRequest::updateOrCreate(['phone' => '0903333444', 'subject' => 'Giao hàng chậm hơn dự kiến'], ['type' => 'complaint', 'status' => 'processing', 'name' => 'Trần Hoàng Nam', 'email' => 'hoangnam@example.test', 'message' => 'Cần kiểm tra lại lịch giao hàng.', 'assigned_to' => User::where('role', 'admin')->value('id')]);
    }
}
