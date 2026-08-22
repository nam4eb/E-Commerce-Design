<?php

namespace App\Filament\Resources\Categories\Schemas;

use App\Filament\Support\MediaUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class CategoryForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('slug')
                    ->unique(ignoreRecord: true)
                    ->regex('/^[a-z0-9]+(?:-[a-z0-9]+)*$/')
                    ->required(),
                Select::make('parent_id')
                    ->relationship('parent', 'name'),
                Textarea::make('description')
                    ->columnSpanFull(),
                MediaUpload::image('image', 'categories'),
                TextInput::make('status')
                    ->required()
                    ->default('active'),
                TextInput::make('sort_order')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('seo_title')->maxLength(60),
                Textarea::make('seo_description')
                    ->maxLength(160)
                    ->columnSpanFull(),
                TextInput::make('canonical_url')
                    ->url(),
                TextInput::make('og_title')->maxLength(95),
                Textarea::make('og_description')
                    ->maxLength(200)
                    ->columnSpanFull(),
                MediaUpload::image('og_image', 'categories/seo'),
            ]);
    }
}
