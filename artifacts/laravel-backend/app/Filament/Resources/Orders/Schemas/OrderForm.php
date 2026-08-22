<?php

namespace App\Filament\Resources\Orders\Schemas;

use App\Enums\OrderStatus;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class OrderForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('idempotency_key')
                    ->required(),
                TextInput::make('number')
                    ->required(),
                Select::make('user_id')
                    ->relationship('user', 'name'),
                Select::make('address_id')
                    ->relationship('address', 'id'),
                Select::make('coupon_id')
                    ->relationship('coupon', 'id'),
                Select::make('status')
                    ->options(OrderStatus::class)
                    ->default('pending')
                    ->required(),
                TextInput::make('currency')
                    ->required()
                    ->default('VND'),
                TextInput::make('subtotal')
                    ->required()
                    ->numeric(),
                TextInput::make('discount_total')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                TextInput::make('shipping_total')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                TextInput::make('installation_total')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                TextInput::make('grand_total')
                    ->required()
                    ->numeric(),
                TextInput::make('customer_name')
                    ->required(),
                TextInput::make('customer_phone')
                    ->tel()
                    ->required(),
                TextInput::make('customer_email')
                    ->email(),
                TextInput::make('shipping_street')
                    ->required(),
                TextInput::make('shipping_ward'),
                TextInput::make('shipping_district')
                    ->required(),
                TextInput::make('shipping_city')
                    ->required(),
                TextInput::make('shipping_postal_code'),
                Textarea::make('notes')
                    ->columnSpanFull(),
                DateTimePicker::make('placed_at'),
                DateTimePicker::make('stock_released_at'),
                DateTimePicker::make('coupon_released_at'),
            ]);
    }
}
