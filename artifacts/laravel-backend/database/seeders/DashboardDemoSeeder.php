<?php

namespace Database\Seeders;

use App\Models\CustomerRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

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

        $statuses = ['delivered', 'delivered', 'delivered', 'shipping', 'processing', 'confirmed', 'pending', 'cancelled'];
        foreach (range(1, 36) as $index) {
            $product = $products[($index - 1) % $products->count()];
            $quantity = ($index % 3) + 1;
            $unitPrice = (int) $product->currentPrice();
            $placedAt = now()->subDays(36 - $index)->setTime(8 + ($index % 10), ($index * 7) % 60);
            $status = $statuses[$index % count($statuses)];
            $order = Order::updateOrCreate(['number' => sprintf('DM365-DASH-%04d', $index)], [
                'idempotency_key' => sprintf('10000000-0000-4000-8000-%012d', $index),
                'user_id' => $customer->id,
                'status' => $status,
                'currency' => 'VND',
                'subtotal' => $unitPrice * $quantity,
                'discount_total' => $index % 4 === 0 ? 100000 : 0,
                'shipping_total' => 0,
                'installation_total' => $product->category?->slug === 'dieu-hoa' ? 350000 : 0,
                'grand_total' => ($unitPrice * $quantity) - ($index % 4 === 0 ? 100000 : 0) + ($product->category?->slug === 'dieu-hoa' ? 350000 : 0),
                'customer_name' => $customer->name,
                'customer_phone' => $customer->phone,
                'customer_email' => $customer->email,
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
        }

        CustomerRequest::updateOrCreate(['phone' => '0901111222', 'subject' => 'Tư vấn điều hòa phòng 20m²'], ['user_id' => $customer->id, 'type' => 'callback', 'status' => 'new', 'name' => 'Nguyễn Minh Anh', 'email' => 'minhanh@example.test', 'message' => 'Vui lòng gọi lại sau 18 giờ.']);
        CustomerRequest::updateOrCreate(['phone' => '0903333444', 'subject' => 'Giao hàng chậm hơn dự kiến'], ['type' => 'complaint', 'status' => 'processing', 'name' => 'Trần Hoàng Nam', 'email' => 'hoangnam@example.test', 'message' => 'Cần kiểm tra lại lịch giao hàng.', 'assigned_to' => User::where('role', 'admin')->value('id')]);
    }
}
