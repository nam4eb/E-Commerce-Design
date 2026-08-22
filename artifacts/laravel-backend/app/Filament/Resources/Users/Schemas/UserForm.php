<?php

namespace App\Filament\Resources\Users\Schemas;

use App\Enums\AdminRole;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email()
                    ->required(),
                DateTimePicker::make('email_verified_at'),
                TextInput::make('password')
                    ->password()
                    ->revealable()
                    ->dehydrated(fn (?string $state): bool => filled($state))
                    ->required(fn (string $operation): bool => $operation === 'create'),
                TextInput::make('phone')
                    ->tel(),
                Select::make('role')
                    ->options([
                        AdminRole::Customer->value => 'Khách hàng',
                        AdminRole::SuperAdmin->value => 'Super admin',
                        AdminRole::CatalogEditor->value => 'Biên tập catalog',
                        AdminRole::ContentEditor->value => 'Biên tập nội dung',
                        AdminRole::OrderOperator->value => 'Vận hành đơn hàng',
                        AdminRole::Support->value => 'Chăm sóc khách hàng',
                        AdminRole::ReadOnly->value => 'Chỉ xem',
                    ])
                    ->required()
                    ->default('customer'),
            ]);
    }
}
