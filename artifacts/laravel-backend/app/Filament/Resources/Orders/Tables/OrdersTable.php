<?php

namespace App\Filament\Resources\Orders\Tables;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\OrderStatusService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class OrdersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('idempotency_key')
                    ->searchable(),
                TextColumn::make('number')
                    ->searchable(),
                TextColumn::make('user.name')
                    ->searchable(),
                TextColumn::make('address.id')
                    ->searchable(),
                TextColumn::make('coupon.id')
                    ->searchable(),
                TextColumn::make('status')
                    ->badge()
                    ->searchable(),
                TextColumn::make('currency')
                    ->searchable(),
                TextColumn::make('subtotal')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('discount_total')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('shipping_total')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('installation_total')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('grand_total')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('customer_name')
                    ->searchable(),
                TextColumn::make('customer_phone')
                    ->searchable(),
                TextColumn::make('customer_email')
                    ->searchable(),
                TextColumn::make('shipping_street')
                    ->searchable(),
                TextColumn::make('shipping_ward')
                    ->searchable(),
                TextColumn::make('shipping_district')
                    ->searchable(),
                TextColumn::make('shipping_city')
                    ->searchable(),
                TextColumn::make('shipping_postal_code')
                    ->searchable(),
                TextColumn::make('placed_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('stock_released_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('coupon_released_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('deleted_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TrashedFilter::make(),
            ])
            ->recordActions([
                Action::make('transition')
                    ->label('Chuyển trạng thái')
                    ->icon('heroicon-o-arrow-path')
                    ->visible(fn (Order $record): bool => auth()->user()?->hasAdminPermission('commerce.manage') === true
                        && app(OrderStatusService::class)->allowedTargets($record) !== [])
                    ->schema(fn (Order $record): array => [
                        Select::make('status')
                            ->label('Trạng thái mới')
                            ->options(app(OrderStatusService::class)->allowedTargets($record))
                            ->required(),
                    ])
                    ->requiresConfirmation()
                    ->action(fn (Order $record, array $data) => app(OrderStatusService::class)
                        ->transition($record, OrderStatus::from($data['status']))),
            ])
            ->toolbarActions([]);
    }
}
