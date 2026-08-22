<?php

namespace App\Filament\Resources\Installations\Schemas;

use App\Enums\InstallationStatus;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class InstallationForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('order_item_id')
                    ->relationship('orderItem', 'id')
                    ->required(),
                TextInput::make('fee')
                    ->required()
                    ->numeric()
                    ->default(0.0),
                Textarea::make('notes')
                    ->columnSpanFull(),
                Select::make('status')
                    ->options(InstallationStatus::class)
                    ->default('pending')
                    ->required(),
                DateTimePicker::make('scheduled_at'),
                DateTimePicker::make('completed_at'),
            ]);
    }
}
