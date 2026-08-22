<?php

namespace App\Http\Controllers;

use App\Enums\ProductStatus;
use App\Models\Category;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function show(Category $category, Product $product): Response
    {
        abort_unless($category->status === 'active' && $product->status === ProductStatus::Active && $product->category_id === $category->id, 404);
        $product->load(['category', 'brand', 'images', 'specifications']);

        $canonical = $product->canonical_url ?: route('products.show', [$category, $product]);
        $title = $product->seo_title ?: $product->name.' | Điện Máy 365';
        $description = $product->seo_description ?: $product->short_description;
        $image = optional($product->images->firstWhere('is_primary', true) ?? $product->images->first())->url;

        $breadcrumbs = [
            ['name' => 'Trang chủ', 'url' => route('home')],
            ['name' => $product->category->name, 'url' => route('categories.show', $category)],
            ['name' => $product->brand->name, 'url' => route('brands.show', $product->brand)],
            ['name' => $product->name, 'url' => $canonical],
        ];

        $jsonLd = [
            'product' => array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Product',
                'name' => $product->name,
                'description' => $product->short_description,
                'sku' => $product->sku,
                'gtin' => $product->gtin,
                'mpn' => $product->mpn,
                'image' => $product->images->pluck('url')->all(),
                'brand' => ['@type' => 'Brand', 'name' => $product->brand->name],
                'offers' => [
                    '@type' => 'Offer',
                    'url' => $canonical,
                    'priceCurrency' => 'VND',
                    'price' => $product->currentPrice(),
                    'availability' => $product->is_available && $product->stock > 0
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock',
                    'itemCondition' => 'https://schema.org/NewCondition',
                ],
            ], fn ($value) => $value !== null && $value !== ''),
            'breadcrumbs' => [
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => collect($breadcrumbs)->map(fn ($item, $index) => [
                    '@type' => 'ListItem', 'position' => $index + 1,
                    'name' => $item['name'], 'item' => $item['url'],
                ])->all(),
            ],
        ];

        return Inertia::render('Products/Show', [
            'product' => [
                ...$product->only(['id', 'name', 'slug', 'sku', 'gtin', 'mpn', 'short_description', 'description', 'price', 'original_price', 'sale_price', 'stock', 'is_available', 'badge', 'btu', 'room_size', 'inverter', 'cooling_type', 'energy_rating', 'warranty']),
                'brand' => $product->brand->only(['name', 'slug']),
                'category' => $product->category->only(['name', 'slug']),
                'images' => $product->images->map->only(['url', 'alt_text', 'is_primary'])->values(),
                'specifications' => $product->specifications->map->only(['name', 'value'])->values(),
                'image' => optional($product->images->firstWhere('is_primary', true) ?? $product->images->first())->only(['url', 'alt_text']),
                'url' => $canonical,
            ],
            'seo' => [...compact('title', 'description', 'canonical', 'image'), 'ogTitle' => $product->og_title, 'ogDescription' => $product->og_description, 'ogImage' => $product->og_image, 'robots' => 'index,follow', 'ogType' => 'product'],
            'breadcrumbs' => $breadcrumbs,
            'jsonLd' => $jsonLd,
        ])->withViewData(compact('title', 'description', 'canonical', 'image', 'jsonLd'));
    }
}
