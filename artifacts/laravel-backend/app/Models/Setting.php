<?php

namespace App\Models;

use App\Services\SettingsRepository;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $guarded = [];

    protected static function booted(): void
    {
        static::saved(fn () => app(SettingsRepository::class)->forget());
        static::deleted(fn () => app(SettingsRepository::class)->forget());
    }

    protected function casts(): array
    {
        return ['is_public' => 'boolean'];
    }
}
