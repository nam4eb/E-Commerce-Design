<?php

namespace App\Filament\Resources\Specifications;

use App\Filament\Resources\Specifications\Pages\CreateSpecification;
use App\Filament\Resources\Specifications\Pages\EditSpecification;
use App\Filament\Resources\Specifications\Pages\ListSpecifications;
use App\Filament\Resources\Specifications\Schemas\SpecificationForm;
use App\Filament\Resources\Specifications\Tables\SpecificationsTable;
use App\Models\Specification;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class SpecificationResource extends Resource
{
    protected static ?string $model = Specification::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static string|\UnitEnum|null $navigationGroup = 'Catalog';

    protected static ?string $navigationLabel = 'Thông số kỹ thuật';

    public static function form(Schema $schema): Schema
    {
        return SpecificationForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SpecificationsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSpecifications::route('/'),
            'create' => CreateSpecification::route('/create'),
            'edit' => EditSpecification::route('/{record}/edit'),
        ];
    }
}
