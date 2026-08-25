<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\BestSellingProducts;
use App\Filament\Widgets\OrderStatusChart;
use App\Filament\Widgets\RecentOrders;
use App\Filament\Widgets\RevenueByBrandChart;
use App\Filament\Widgets\RevenueByCategoryChart;
use App\Filament\Widgets\SalesTrendChart;
use App\Filament\Widgets\StoreStats;
use App\Models\Brand;
use App\Models\Category;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Pages\Dashboard as BaseDashboard;
use Filament\Pages\Dashboard\Concerns\HasFiltersForm;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class Dashboard extends BaseDashboard
{
    use HasFiltersForm;

    protected static ?string $title = 'Báo cáo & Thống kê Doanh số';

    protected static ?string $navigationLabel = 'Tổng quan';

    public function getFiltersFormContentComponent(): Component
    {
        return parent::getFiltersFormContentComponent()->columnSpanFull();
    }

    public function filtersForm(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Bộ lọc báo cáo')
                ->description('Thống kê được tổng hợp trực tiếp từ đơn hàng và dữ liệu catalog.')
                ->columnSpanFull()
                ->columns(['default' => 1, 'sm' => 2, 'lg' => 3, '2xl' => 5])
                ->schema([
                    Select::make('period')->label('Khoảng nhanh')->options(['custom' => 'Tùy chọn ngày', 'today' => 'Hôm nay', '7_days' => '7 ngày', '30_days' => '30 ngày', 'this_month' => 'Tháng này', 'last_month' => 'Tháng trước'])->default('30_days')->selectablePlaceholder(false),
                    DatePicker::make('from')->label('Từ ngày')->default(now()->subDays(29)->toDateString())->maxDate(now()),
                    DatePicker::make('to')->label('Đến ngày')->default(now()->toDateString())->maxDate(now()),
                    Select::make('category_id')->label('Danh mục')->options(fn () => Category::query()->orderBy('name')->pluck('name', 'id'))->searchable()->placeholder('Tất cả danh mục'),
                    Select::make('brand_id')->label('Thương hiệu')->options(fn () => Brand::query()->orderBy('name')->pluck('name', 'id'))->searchable()->placeholder('Tất cả thương hiệu'),
                ]),
        ]);
    }

    public function getWidgets(): array
    {
        return [
            StoreStats::class,
            SalesTrendChart::class,
            OrderStatusChart::class,
            BestSellingProducts::class,
            RevenueByCategoryChart::class,
            RevenueByBrandChart::class,
            RecentOrders::class,
        ];
    }

    public function getColumns(): int|array
    {
        return ['default' => 1, 'xl' => 2];
    }
}
