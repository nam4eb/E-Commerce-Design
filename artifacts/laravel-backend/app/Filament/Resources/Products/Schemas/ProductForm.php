<?php

namespace App\Filament\Resources\Products\Schemas;

use App\Enums\ProductStatus;
use App\Filament\Support\MediaUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class ProductForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('category_id')
                    ->relationship('category', 'name')
                    ->required(),
                Select::make('brand_id')
                    ->relationship('brand', 'name')
                    ->required(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('slug')
                    ->unique(ignoreRecord: true)
                    ->regex('/^[a-z0-9]+(?:-[a-z0-9]+)*$/')
                    ->required(),
                TextInput::make('legacy_id'),
                TextInput::make('sku')
                    ->label('SKU')
                    ->unique(ignoreRecord: true)
                    ->required(),
                TextInput::make('gtin'),
                TextInput::make('mpn'),
                Textarea::make('short_description')
                    ->columnSpanFull(),
                Textarea::make('description')
                    ->columnSpanFull(),
                TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->prefix('$'),
                TextInput::make('original_price')
                    ->numeric()
                    ->prefix('$'),
                TextInput::make('sale_price')
                    ->numeric()
                    ->prefix('$'),
                TextInput::make('stock')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('sold_count')
                    ->required()
                    ->numeric()
                    ->default(0),
                Toggle::make('is_available')
                    ->required(),
                TextInput::make('badge'),
                Select::make('status')
                    ->options(ProductStatus::class)
                    ->default('draft')
                    ->required(),
                TextInput::make('btu')
                    ->numeric(),
                TextInput::make('room_size'),
                Toggle::make('inverter'),
                TextInput::make('cooling_type'),
                TextInput::make('energy_rating'),
                TextInput::make('warranty'),
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
                MediaUpload::image('og_image', 'products/seo'),
            ]);
    }
}
