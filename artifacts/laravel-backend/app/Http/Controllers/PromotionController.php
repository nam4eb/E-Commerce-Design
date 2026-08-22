<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use App\Services\CatalogQuery;
use Inertia\Inertia;
use Inertia\Response;

class PromotionController extends Controller
{
    public function index(CatalogQuery $catalog): Response
    {
        $promotions = Promotion::query()
            ->where('is_active', true)
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()))
            ->with(['products:id', 'categories:id', 'brands:id'])
            ->orderByDesc('priority')
            ->get();

        $products = $catalog->activeProducts()->with(['brand', 'category', 'images'])
            ->orderByDesc('sold_count')->get();

        $items = $promotions->map(function (Promotion $promotion) use ($catalog, $products) {
            $productIds = $promotion->products->modelKeys();
            $categoryIds = $promotion->categories->modelKeys();
            $brandIds = $promotion->brands->modelKeys();
            $global = $productIds === [] && $categoryIds === [] && $brandIds === [];
            $eligible = $products->filter(fn ($product) => $global
                || in_array($product->id, $productIds, true)
                || in_array($product->category_id, $categoryIds, true)
                || in_array($product->brand_id, $brandIds, true));

            return [
                ...$promotion->only(['id', 'name', 'type', 'value', 'maximum_discount']),
                'ends_at' => $promotion->ends_at?->toDateString(),
                'products' => $eligible->take(10)->map(fn ($product) => $catalog->card($product))->values(),
            ];
        });

        $canonical = route('promotions.index');
        $title = 'Khuyến mãi điện máy mới nhất | Điện Máy 365';
        $description = 'Tổng hợp ưu đãi điều hòa, tủ lạnh, máy giặt, tivi và thiết bị gia dụng đang áp dụng tại Điện Máy 365.';
        $breadcrumbs = [
            ['name' => 'Trang chủ', 'url' => route('home')],
            ['name' => 'Khuyến mãi', 'url' => $canonical],
        ];

        return Inertia::render('Promotions/Index', [
            'promotions' => $items,
            'seo' => compact('title', 'description', 'canonical') + ['robots' => 'index,follow', 'ogType' => 'website'],
            'breadcrumbs' => $breadcrumbs,
            'jsonLd' => ['breadcrumbs' => [
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => collect($breadcrumbs)->map(fn ($item, $index) => [
                    '@type' => 'ListItem', 'position' => $index + 1, 'name' => $item['name'], 'item' => $item['url'],
                ])->all(),
            ]],
        ])->withViewData(compact('title', 'description', 'canonical'));
    }
}
