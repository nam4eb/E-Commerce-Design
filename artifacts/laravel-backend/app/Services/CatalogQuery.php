<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

class CatalogQuery
{
    public function activeProducts(): Builder
    {
        return Product::query()->where('status', 'active')->where('is_available', true);
    }

    public function applyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['q'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query
                ->where('name', 'like', '%'.$search.'%')
                ->orWhere('sku', 'like', '%'.$search.'%')
                ->orWhere('short_description', 'like', '%'.$search.'%')
                ->orWhereHas('brand', fn (Builder $brand) => $brand->where('name', 'like', '%'.$search.'%'))))
            ->when($filters['brand'] ?? null, fn (Builder $query, string $brand) => $query->whereHas('brand', fn (Builder $query) => $query->where('slug', $brand)))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->whereHas('category', fn (Builder $query) => $query->where('slug', $category)))
            ->when($filters['btu'] ?? null, fn (Builder $query, int $btu) => $query->where('btu', $btu))
            ->when(($filters['inverter'] ?? null) === '1', fn (Builder $query) => $query->where('inverter', true))
            ->when($filters['min_price'] ?? null, fn (Builder $query, int $price) => $query->whereRaw('COALESCE(sale_price, price) >= ?', [$price]))
            ->when($filters['max_price'] ?? null, fn (Builder $query, int $price) => $query->whereRaw('COALESCE(sale_price, price) <= ?', [$price]));
    }

    public function applySort(Builder $query, string $sort): Builder
    {
        match ($sort) {
            'price-low' => $query->orderByRaw('COALESCE(sale_price, price) ASC'),
            'price-high' => $query->orderByRaw('COALESCE(sale_price, price) DESC'),
            'sale' => $query->orderByRaw('(COALESCE(original_price, price) - COALESCE(sale_price, price)) DESC'),
            default => $query->orderByDesc('sold_count')->orderByDesc('id'),
        };

        return $query;
    }

    public function card(Product $product): array
    {
        return [
            ...$product->only(['id', 'name', 'slug', 'sku', 'price', 'original_price', 'sale_price', 'stock', 'is_available', 'badge', 'btu', 'room_size', 'inverter']),
            'brand' => $product->brand->only(['name', 'slug']),
            'category' => $product->category->only(['name', 'slug']),
            'image' => optional($product->images->first())->only(['url', 'alt_text']),
            'url' => route('products.show', [$product->category, $product]),
        ];
    }
}
