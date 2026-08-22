<?php

namespace App\Filament\Resources\Payments\Schemas;

use App\Enums\PaymentStatus;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class PaymentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('order_id')
                    ->relationship('order', 'id')
                    ->required(),
                TextInput::make('provider')
                    ->required(),
                TextInput::make('method'),
                TextInput::make('transaction_id'),
                Select::make('status')
                    ->options(PaymentStatus::class)
                    ->default('pending')
                    ->required(),
                TextInput::make('currency')
                    ->required()
                    ->default('VND'),
                TextInput::make('amount')
                    ->required()
                    ->numeric(),
                TextInput::make('payload'),
                DateTimePicker::make('paid_at'),
                DateTimePicker::make('provider_synced_at'),
                Textarea::make('last_error')
                    ->columnSpanFull(),
            ]);
    }
}
