<?php

namespace App\Filament\Widgets;

use App\Models\Order;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Database\Eloquent\Builder;

class RecentOrders extends TableWidget
{
    protected static ?string $heading = 'Đơn hàng gần đây';

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => Order::query()->latest())
            ->columns([
                TextColumn::make('number')->label('Mã đơn')->searchable(),
                TextColumn::make('customer_name')->label('Khách hàng'),
                TextColumn::make('status')->label('Trạng thái')->badge(),
                TextColumn::make('grand_total')->label('Tổng cộng')->money('VND')->sortable(),
                TextColumn::make('placed_at')->label('Ngày đặt')->dateTime('d/m/Y H:i'),
            ]);
    }
}
