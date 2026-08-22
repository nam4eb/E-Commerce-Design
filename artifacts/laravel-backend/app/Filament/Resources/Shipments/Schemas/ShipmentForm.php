<?php

namespace App\Filament\Resources\Shipments\Schemas;

use App\Enums\ShipmentStatus;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class ShipmentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('order_id')
                    ->relationship('order', 'id')
                    ->required(),
                TextInput::make('provider')
                    ->required()
                    ->default('manual'),
                TextInput::make('carrier'),
                TextInput::make('tracking_number'),
                TextInput::make('payload'),
                Select::make('status')
                    ->options(ShipmentStatus::class)
                    ->default('pending')
                    ->required(),
                DateTimePicker::make('shipped_at'),
                DateTimePicker::make('delivered_at'),
                DateTimePicker::make('provider_synced_at'),
                Textarea::make('last_error')
                    ->columnSpanFull(),
            ]);
    }
}
