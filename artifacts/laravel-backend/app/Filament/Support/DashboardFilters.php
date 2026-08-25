<?php

namespace App\Filament\Support;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

final class DashboardFilters
{
    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    public static function range(?array $filters): array
    {
        $preset = $filters['period'] ?? 'custom';
        if ($preset !== 'custom') {
            $today = now()->toImmutable();

            return match ($preset) {
                'today' => [$today->startOfDay(), $today->endOfDay()],
                '7_days' => [$today->subDays(6)->startOfDay(), $today->endOfDay()],
                '30_days' => [$today->subDays(29)->startOfDay(), $today->endOfDay()],
                'this_month' => [$today->startOfMonth(), $today->endOfDay()],
                'last_month' => [$today->subMonthNoOverflow()->startOfMonth(), $today->subMonthNoOverflow()->endOfMonth()],
                default => [$today->subDays(29)->startOfDay(), $today->endOfDay()],
            };
        }

        $to = filled($filters['to'] ?? null)
            ? CarbonImmutable::parse($filters['to'])->endOfDay()
            : now()->toImmutable()->endOfDay();
        $from = filled($filters['from'] ?? null)
            ? CarbonImmutable::parse($filters['from'])->startOfDay()
            : $to->subDays(29)->startOfDay();

        return $from->greaterThan($to) ? [$to->startOfDay(), $to] : [$from, $to];
    }

    public static function orders(Builder $query, ?array $filters, string $dateColumn = 'placed_at'): Builder
    {
        [$from, $to] = self::range($filters);

        return $query
            ->whereBetween($dateColumn, [$from, $to])
            ->when($filters['category_id'] ?? null, fn (Builder $query, $categoryId) => $query->whereHas('items.product', fn (Builder $query) => $query->where('category_id', $categoryId)))
            ->when($filters['brand_id'] ?? null, fn (Builder $query, $brandId) => $query->whereHas('items.product', fn (Builder $query) => $query->where('brand_id', $brandId)));
    }
}
