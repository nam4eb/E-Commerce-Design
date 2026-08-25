<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardFilters;
use App\Models\OrderItem;
use Filament\Widgets\ChartWidget;
use Filament\Widgets\Concerns\InteractsWithPageFilters;

class RevenueByBrandChart extends ChartWidget
{
    use InteractsWithPageFilters;

    protected ?string $heading = 'Top thương hiệu doanh thu lớn nhất';

    protected ?string $description = 'Doanh thu đơn đã giao theo hãng sản xuất';

    protected int|string|array $columnSpan = 1;

    protected function getData(): array
    {
        [$from, $to] = DashboardFilters::range($this->pageFilters);
        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('brands', 'brands.id', '=', 'products.brand_id')
            ->where('orders.status', 'delivered')->whereBetween('orders.placed_at', [$from, $to])
            ->when($this->pageFilters['category_id'] ?? null, fn ($query, $id) => $query->where('products.category_id', $id))
            ->when($this->pageFilters['brand_id'] ?? null, fn ($query, $id) => $query->where('brands.id', $id))
            ->selectRaw('brands.name as label, SUM(order_items.line_total) as total')
            ->groupBy('brands.id', 'brands.name')->orderByDesc('total')->limit(10)->get();

        return ['datasets' => [['label' => 'Doanh thu', 'data' => $rows->pluck('total')->map(fn ($value) => (float) $value), 'backgroundColor' => '#f59e0b']], 'labels' => $rows->pluck('label')];
    }

    protected function getType(): string
    {
        return 'bar';
    }

    protected function getOptions(): array
    {
        return ['indexAxis' => 'y'];
    }
}
