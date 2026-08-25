<?php

namespace App\Filament\Widgets;

use App\Filament\Support\DashboardFilters;
use App\Models\OrderItem;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\Concerns\InteractsWithPageFilters;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;

class BestSellingProducts extends TableWidget
{
    use InteractsWithPageFilters;

    protected static ?string $heading = 'Top 10 sản phẩm bán chạy nhất';

    protected int|string|array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        [$from, $to] = DashboardFilters::range($this->pageFilters);

        return $table
            ->query(fn (): Builder => OrderItem::query()
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->where('orders.status', 'delivered')->whereBetween('orders.placed_at', [$from, $to])
                ->when($this->pageFilters['category_id'] ?? null, fn ($query, $id) => $query->where('products.category_id', $id))
                ->when($this->pageFilters['brand_id'] ?? null, fn ($query, $id) => $query->where('products.brand_id', $id))
                ->selectRaw('MIN(order_items.id) as id, products.name as product_name, products.sku, SUM(order_items.quantity) as sold_quantity, SUM(order_items.line_total) as revenue')
                ->groupBy('products.id', 'products.name', 'products.sku')->orderByDesc('sold_quantity')->limit(10))
            ->columns([
                TextColumn::make('product_name')->label('Tên sản phẩm')->searchable(),
                TextColumn::make('sku')->label('SKU'),
                TextColumn::make('sold_quantity')->label('Số lượng bán')->numeric()->sortable(),
                TextColumn::make('revenue')->label('Doanh thu')->money('VND')->sortable(),
            ])
            ->paginated(false);
    }
}
