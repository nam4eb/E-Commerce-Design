<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardFilters;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StoreStats extends StatsOverviewWidget
{
    use InteractsWithPageFilters;

    protected int|string|array $columnSpan = 'full';

    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $orders = DashboardFilters::orders(Order::query(), $this->pageFilters);
        $deliveredRevenue = (clone $orders)->where('status', 'delivered')->sum('grand_total');
        [$from, $to] = DashboardFilters::range($this->pageFilters);

        return [
            Stat::make('Tổng đơn hàng', (clone $orders)->count())->description((clone $orders)->where('status', 'pending')->count().' đang chờ')->color('primary'),
            Stat::make('Tổng sản phẩm', Product::count())->description(Product::where('stock', '<=', 5)->count().' sắp hết hàng')->color(Product::where('stock', '<=', 5)->exists() ? 'danger' : 'success'),
            Stat::make('Khách hàng mới', User::where('role', 'customer')->whereBetween('created_at', [$from, $to])->count())->description('Trong kỳ đã chọn')->color('info'),
            Stat::make('Doanh thu', number_format((float) $deliveredRevenue, 0, ',', '.').' ₫')->description('Đơn đã giao')->color('success'),
            Stat::make('Đánh giá TB', number_format((float) Review::where('status', 'approved')->avg('rating'), 1).'/5')->description(Review::where('status', 'approved')->count().' đánh giá đã duyệt')->color('warning'),
        ];
    }
}
