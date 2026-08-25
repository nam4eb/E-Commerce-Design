<?php

namespace App\Filament\Resources\CustomerRequests\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class CustomerRequestsTable
{
    public static function configure(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('type')->label('Loại')->badge()->formatStateUsing(fn (string $state) => match ($state) {
                'callback' => 'Gọi lại', 'complaint' => 'Khiếu nại', default => 'Hỗ trợ'
            }),
            TextColumn::make('name')->label('Khách hàng')->searchable(),
            TextColumn::make('phone')->label('Điện thoại')->searchable(),
            TextColumn::make('subject')->label('Chủ đề')->limit(45),
            TextColumn::make('status')->label('Trạng thái')->badge(),
            TextColumn::make('assignee.name')->label('Phụ trách'),
            TextColumn::make('created_at')->label('Tiếp nhận')->dateTime('d/m/Y H:i')->sortable(),
        ])->filters([
            SelectFilter::make('type')->label('Loại')->options(['callback' => 'Gọi lại', 'complaint' => 'Khiếu nại', 'support' => 'Hỗ trợ']),
            SelectFilter::make('status')->label('Trạng thái')->options(['new' => 'Mới', 'contacted' => 'Đã liên hệ', 'processing' => 'Đang xử lý', 'resolved' => 'Đã giải quyết', 'closed' => 'Đã đóng']),
        ])->recordActions([EditAction::make()]);
    }
}
