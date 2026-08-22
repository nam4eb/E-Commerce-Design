<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingsRepository
{
    private const CACHE_KEY = 'commerce.settings.all';

    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn () => Setting::query()
            ->get(['key', 'value', 'type'])
            ->mapWithKeys(fn (Setting $setting) => [$setting->key => $this->cast($setting->value, $setting->type)])
            ->all());
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private function cast(?string $value, string $type): mixed
    {
        return match ($type) {
            'integer' => (int) $value,
            'float', 'decimal' => (float) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($value ?? 'null', true),
            default => $value,
        };
    }
}
