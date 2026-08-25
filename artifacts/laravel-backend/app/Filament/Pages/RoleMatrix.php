<?php

namespace App\Filament\Pages;

use App\Enums\AdminRole;
use BackedEnum;
use Filament\Pages\Page;
use Filament\Support\Icons\Heroicon;

class RoleMatrix extends Page
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedShieldCheck;

    protected static string|\UnitEnum|null $navigationGroup = 'Phân quyền';

    protected static ?string $navigationLabel = 'Vai trò & Quyền hạn';

    protected static ?string $title = 'Ma trận vai trò và quyền hạn';

    protected string $view = 'filament.pages.role-matrix';

    public static function canAccess(): bool
    {
        return auth()->user()?->role === AdminRole::SuperAdmin;
    }

    public function getRoleMatrix(): array
    {
        return [
            'Super admin' => ['Toàn quyền hệ thống', 'Quản lý tài khoản quản trị', 'Cấu hình và nhật ký'],
            'Biên tập catalog' => ['Xem và quản lý catalog', 'Xem nội dung'],
            'Biên tập nội dung' => ['Xem catalog', 'Quản lý bài viết', 'Kiểm duyệt đánh giá'],
            'Vận hành đơn hàng' => ['Xem catalog', 'Quản lý đơn hàng', 'Xem khách hàng'],
            'Chăm sóc khách hàng' => ['Xem đơn hàng', 'Xem khách hàng', 'Xem đánh giá và yêu cầu'],
            'Chỉ xem' => ['Chỉ đọc catalog, nội dung, đơn hàng, khách hàng và đánh giá'],
        ];
    }
}
