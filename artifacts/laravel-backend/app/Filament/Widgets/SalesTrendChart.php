<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardFilters;
use App\Models\Order;
use Filament\Widgets\ChartWidget;
use Filament\Widgets\Concerns\InteractsWithPageFilters;

class SalesTrendChart extends ChartWidget
{
    use InteractsWithPageFilters;

    protected ?string $heading = 'Xu hướng doanh thu & đơn hàng';

    protected ?string $description = 'Diễn biến theo ngày trong khoảng thời gian đã chọn';

    protected int|string|array $columnSpan = 1;

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        [$from, $to] = DashboardFilters::range($this->pageFilters);
        $labels = [];
        $revenue = [];
        $orders = [];

        for ($date = $from; $date->lte($to); $date = $date->addDay()) {
            $daily = DashboardFilters::orders(Order::query(), $this->pageFilters)
                ->whereDate('placed_at', $date->toDateString());
            $labels[] = $date->format('d/m');
            $revenue[] = (float) (clone $daily)->where('status', 'delivered')->sum('grand_total');
            $orders[] = (clone $daily)->count();
        }

        return [
            'datasets' => [
                ['label' => 'Doanh thu', 'data' => $revenue, 'borderColor' => '#a855f7', 'backgroundColor' => 'rgba(168,85,247,.18)', 'yAxisID' => 'y'],
                ['label' => 'Đơn hàng', 'data' => $orders, 'borderColor' => '#3b82f6', 'backgroundColor' => 'rgba(59,130,246,.18)', 'yAxisID' => 'y1'],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getOptions(): array
    {
        return ['interaction' => ['mode' => 'index', 'intersect' => false], 'scales' => ['y' => ['beginAtZero' => true], 'y1' => ['beginAtZero' => true, 'position' => 'right', 'grid' => ['drawOnChartArea' => false]]]];
    }
}
