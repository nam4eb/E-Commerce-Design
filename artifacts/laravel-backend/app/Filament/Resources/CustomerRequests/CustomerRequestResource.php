<?php

namespace App\Filament\Resources\CustomerRequests;

use App\Filament\Resources\CustomerRequests\Pages\EditCustomerRequest;
use App\Filament\Resources\CustomerRequests\Pages\ListCustomerRequests;
use App\Filament\Resources\CustomerRequests\Schemas\CustomerRequestForm;
use App\Filament\Resources\CustomerRequests\Tables\CustomerRequestsTable;
use App\Models\CustomerRequest;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class CustomerRequestResource extends Resource
{
    protected static ?string $model = CustomerRequest::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedPhone;

    protected static string|\UnitEnum|null $navigationGroup = 'Khách hàng';

    protected static ?string $navigationLabel = 'Yêu cầu & Khiếu nại';

    protected static ?string $modelLabel = 'yêu cầu khách hàng';

    protected static ?string $pluralModelLabel = 'Yêu cầu & Khiếu nại';

    public static function form(Schema $schema): Schema
    {
        return CustomerRequestForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return CustomerRequestsTable::configure($table);
    }

    public static function getPages(): array
    {
        return ['index' => ListCustomerRequests::route('/'), 'edit' => EditCustomerRequest::route('/{record}/edit')];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->hasAdminPermission('customers.view') === true;
    }

    public static function canEdit($record): bool
    {
        return auth()->user()?->hasAdminPermission('customers.manage') === true;
    }

    public static function canDelete($record): bool
    {
        return false;
    }
}
