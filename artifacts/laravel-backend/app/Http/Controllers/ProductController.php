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
        $reviews = $product->reviews()->approved()->with('user:id,name')->latest('approved_at')->take(20)->get();
        $reviewCount = $reviews->count();
        $averageRating = $reviewCount > 0 ? round((float) $reviews->avg('rating'), 1) : null;

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

        $productJsonLd = array_filter([
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
        ], fn ($value) => $value !== null && $value !== '');
        if ($reviewCount > 0) {
            $productJsonLd['aggregateRating'] = [
                '@type' => 'AggregateRating',
                'ratingValue' => $averageRating,
                'reviewCount' => $reviewCount,
            ];
            $productJsonLd['review'] = $reviews->map(fn ($review) => array_filter([
                '@type' => 'Review',
                'author' => ['@type' => 'Person', 'name' => $review->reviewer_name ?: $review->user?->name],
                'datePublished' => $review->approved_at?->toDateString(),
                'reviewRating' => ['@type' => 'Rating', 'ratingValue' => $review->rating, 'bestRating' => 5],
                'name' => $review->title,
                'reviewBody' => $review->content,
            ]))->values()->all();
        }

        $jsonLd = [
            'product' => $productJsonLd,
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
                'images' => $product->images->map(fn ($productImage) => [
                    ...$productImage->only(['url', 'alt_text', 'is_primary']),
                    'variants' => $productImage->variantUrls(),
                ])->values(),
                'specifications' => $product->specifications->map->only(['name', 'value'])->values(),
                'image' => (($primaryImage = $product->images->firstWhere('is_primary', true) ?? $product->images->first())) ? [
                    ...$primaryImage->only(['url', 'alt_text']),
                    'variants' => $primaryImage->variantUrls(),
                ] : null,
                'url' => $canonical,
            ],
            'seo' => [...compact('title', 'description', 'canonical', 'image'), 'ogTitle' => $product->og_title, 'ogDescription' => $product->og_description, 'ogImage' => $product->og_image, 'robots' => 'index,follow', 'ogType' => 'product'],
            'breadcrumbs' => $breadcrumbs,
            'reviews' => $reviews->map(fn ($review) => [
                'id' => $review->id,
                'rating' => $review->rating,
                'title' => $review->title,
                'content' => $review->content,
                'reviewer_name' => $review->reviewer_name ?: $review->user?->name,
                'verified_purchase' => $review->verified_at !== null,
                'approved_at' => $review->approved_at?->toDateString(),
            ])->values(),
            'reviewSummary' => ['count' => $reviewCount, 'average' => $averageRating],
            'myReview' => auth()->check()
                ? $product->reviews()->where('user_id', auth()->id())->first()?->only(['rating', 'title', 'content', 'status'])
                : null,
            'jsonLd' => $jsonLd,
        ])->withViewData(compact('title', 'description', 'canonical', 'image', 'jsonLd'));
    }
}
