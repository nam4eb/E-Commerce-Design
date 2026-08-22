<?php

namespace App\Filament\Resources\Brands\Schemas;

use App\Filament\Support\MediaUpload;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class BrandForm
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
                Textarea::make('description')
                    ->columnSpanFull(),
                MediaUpload::image('logo', 'brands/logos'),
                TextInput::make('status')
                    ->required()
                    ->default('active'),
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
                MediaUpload::image('og_image', 'brands/seo'),
            ]);
    }
}
