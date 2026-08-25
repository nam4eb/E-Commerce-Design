<?php

namespace App\Filament\Resources\AuditLogs\Tables;

use App\Models\AuditLog;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class AuditLogsTable
{
    public static function configure(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('created_at')->label('Thời gian')->dateTime('d/m/Y H:i:s')->sortable(),
            TextColumn::make('actor.name')->label('Người thực hiện')->searchable(),
            TextColumn::make('event')->label('Hành động')->badge()->searchable(),
            TextColumn::make('auditable_type')->label('Đối tượng')->formatStateUsing(fn (?string $state) => $state ? class_basename($state) : 'Hệ thống'),
            TextColumn::make('auditable_id')->label('ID'),
            TextColumn::make('ip_address')->label('IP'),
            TextColumn::make('request_id')->label('Request ID')->copyable()->toggleable(isToggledHiddenByDefault: true),
        ])->filters([SelectFilter::make('event')->label('Hành động')->options(fn () => AuditLog::query()->distinct()->orderBy('event')->pluck('event', 'event')->all())])
            ->defaultSort('created_at', 'desc');
    }
}
