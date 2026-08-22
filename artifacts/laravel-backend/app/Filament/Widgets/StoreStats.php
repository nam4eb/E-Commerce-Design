<?php

namespace App\Filament\Widgets;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StoreStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Doanh thu', number_format((float) Order::where('status', 'delivered')->sum('grand_total'), 0, ',', '.').' ₫'),
            Stat::make('Đơn hàng', Order::count())->description(Order::where('status', 'pending')->count().' đang chờ'),
            Stat::make('Khách hàng', User::where('role', 'customer')->count()),
            Stat::make('Sản phẩm', Product::where('status', 'active')->count())->description(Product::where('stock', '<=', 5)->count().' sắp hết hàng')->color(Product::where('stock', '<=', 5)->exists() ? 'danger' : 'success'),
        ];
    }
}
