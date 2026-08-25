<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardFilters;
use App\Models\Order;
use Filament\Widgets\ChartWidget;
use Filament\Widgets\Concerns\InteractsWithPageFilters;

class OrderStatusChart extends ChartWidget
{
    use InteractsWithPageFilters;

    protected ?string $heading = 'Phân bổ trạng thái đơn hàng';

    protected ?string $description = 'Tỷ lệ đơn hàng theo trạng thái';

    protected int|string|array $columnSpan = 1;

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        $statuses = ['pending' => 'Chờ xác nhận', 'confirmed' => 'Đã xác nhận', 'processing' => 'Đang xử lý', 'shipping' => 'Đang giao', 'delivered' => 'Đã giao', 'cancelled' => 'Đã hủy', 'failed' => 'Thất bại'];
        $counts = DashboardFilters::orders(Order::query(), $this->pageFilters)
            ->selectRaw('status, COUNT(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');

        return [
            'datasets' => [[
                'data' => array_map(fn ($status) => (int) ($counts[$status] ?? 0), array_keys($statuses)),
                'backgroundColor' => ['#8b5cf6', '#3b82f6', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#64748b'],
            ]],
            'labels' => array_values($statuses),
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
