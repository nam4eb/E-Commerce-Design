<?php

namespace App\Filament\Resources\Reviews\Schemas;

use App\Enums\ReviewStatus;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class ReviewForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('product_id')
                    ->relationship('product', 'name')
                    ->required(),
                Select::make('user_id')
                    ->relationship('user', 'name'),
                TextInput::make('reviewer_name'),
                TextInput::make('reviewer_email')
                    ->email(),
                TextInput::make('rating')
                    ->required()
                    ->numeric(),
                TextInput::make('title'),
                Textarea::make('content')
                    ->columnSpanFull(),
                Select::make('status')
                    ->options(ReviewStatus::class)
                    ->default('pending')
                    ->required(),
                DateTimePicker::make('verified_at'),
                DateTimePicker::make('approved_at'),
            ]);
    }
}
