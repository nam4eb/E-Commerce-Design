<?php

namespace App\Filament\Resources\Reviews\Tables;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Services\ReviewModerationService;
use Filament\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ReviewsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('product.name')
                    ->searchable(),
                TextColumn::make('user.name')
                    ->searchable(),
                TextColumn::make('reviewer_name')
                    ->searchable(),
                TextColumn::make('reviewer_email')
                    ->searchable(),
                TextColumn::make('rating')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('title')
                    ->searchable(),
                TextColumn::make('status')
                    ->badge()
                    ->searchable(),
                TextColumn::make('verified_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('approved_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                Action::make('approve')
                    ->label('Duyệt')
                    ->color('success')
                    ->visible(fn (Review $record): bool => $record->status !== ReviewStatus::Approved
                        && auth()->user()?->hasAdminPermission('reviews.manage') === true)
                    ->requiresConfirmation()
                    ->action(fn (Review $record) => app(ReviewModerationService::class)->moderate($record, ReviewStatus::Approved)),
                Action::make('reject')
                    ->label('Từ chối')
                    ->color('danger')
                    ->visible(fn (Review $record): bool => $record->status !== ReviewStatus::Rejected
                        && auth()->user()?->hasAdminPermission('reviews.manage') === true)
                    ->requiresConfirmation()
                    ->action(fn (Review $record) => app(ReviewModerationService::class)->moderate($record, ReviewStatus::Rejected)),
            ])
            ->toolbarActions([]);
    }
}
