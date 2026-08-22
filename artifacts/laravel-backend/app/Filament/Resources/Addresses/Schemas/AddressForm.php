<?php

namespace App\Filament\Resources\Addresses\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class AddressForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->relationship('user', 'name')
                    ->required(),
                TextInput::make('label'),
                TextInput::make('recipient_name')
                    ->required(),
                TextInput::make('phone')
                    ->tel()
                    ->required(),
                TextInput::make('street')
                    ->required(),
                TextInput::make('ward'),
                TextInput::make('district')
                    ->required(),
                TextInput::make('city')
                    ->required(),
                TextInput::make('postal_code'),
                Toggle::make('is_default')
                    ->required(),
            ]);
    }
}
