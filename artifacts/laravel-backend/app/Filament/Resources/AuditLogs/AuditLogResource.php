<?php

namespace App\Filament\Resources\AuditLogs;

use App\Enums\AdminRole;
use App\Filament\Resources\AuditLogs\Pages\ListAuditLogs;
use App\Filament\Resources\AuditLogs\Tables\AuditLogsTable;
use App\Models\AuditLog;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class AuditLogResource extends Resource
{
    protected static ?string $model = AuditLog::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentMagnifyingGlass;

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

    protected static ?string $navigationLabel = 'Nhật ký hoạt động';

    protected static ?string $pluralModelLabel = 'Nhật ký hoạt động';

    public static function table(Table $table): Table
    {
        return AuditLogsTable::configure($table);
    }

    public static function getPages(): array
    {
        return ['index' => ListAuditLogs::route('/')];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->role === AdminRole::SuperAdmin;
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }
}
