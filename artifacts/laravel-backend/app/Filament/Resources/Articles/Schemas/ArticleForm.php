<?php

namespace App\Filament\Resources\Articles\Schemas;

use App\Enums\ArticleStatus;
use App\Filament\Support\MediaUpload;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class ArticleForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('author_id')
                    ->relationship('author', 'name'),
                TextInput::make('title')
                    ->required(),
                TextInput::make('slug')
                    ->unique(ignoreRecord: true)
                    ->regex('/^[a-z0-9]+(?:-[a-z0-9]+)*$/')
                    ->required(),
                Textarea::make('excerpt')
                    ->columnSpanFull(),
                Textarea::make('content')
                    ->required()
                    ->columnSpanFull(),
                MediaUpload::image('featured_image', 'articles'),
                Select::make('status')
                    ->options(ArticleStatus::class)
                    ->default('draft')
                    ->required(),
                DateTimePicker::make('published_at'),
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
                MediaUpload::image('og_image', 'articles/seo'),
            ]);
    }
}
