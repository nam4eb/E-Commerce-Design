<?php

namespace App\Filament\Resources\CustomerRequests\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class CustomerRequestForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Thông tin khách hàng')->columns(2)->schema([
                Select::make('type')->label('Loại yêu cầu')->options(['callback' => 'Yêu cầu gọi lại', 'complaint' => 'Góp ý / Khiếu nại', 'support' => 'Hỗ trợ'])->required(),
                Select::make('status')->label('Trạng thái')->options(['new' => 'Mới', 'contacted' => 'Đã liên hệ', 'processing' => 'Đang xử lý', 'resolved' => 'Đã giải quyết', 'closed' => 'Đã đóng'])->required(),
                TextInput::make('name')->label('Họ tên')->required(),
                TextInput::make('phone')->label('Điện thoại')->tel()->required(),
                TextInput::make('email')->label('Email')->email(),
                TextInput::make('subject')->label('Chủ đề'),
                Textarea::make('message')->label('Nội dung')->columnSpanFull()->disabled(),
            ]),
            Section::make('Xử lý nội bộ')->columns(2)->schema([
                Select::make('assigned_to')->label('Nhân viên phụ trách')->relationship('assignee', 'name')->searchable()->preload(),
                DateTimePicker::make('resolved_at')->label('Hoàn tất lúc'),
                Textarea::make('admin_notes')->label('Ghi chú xử lý')->columnSpanFull(),
            ]),
        ]);
    }
}
