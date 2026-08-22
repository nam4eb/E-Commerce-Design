<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Services\CatalogQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function show(Request $request, Category $category, CatalogQuery $catalog): Response
    {
        abort_unless($category->status === 'active' && in_array($category->slug, config('catalog.category_slugs'), true), 404);
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'brand' => ['nullable', 'string', 'max:100', Rule::exists('brands', 'slug')->where('status', 'active')],
            'btu' => ['nullable', 'integer', Rule::in([9000, 12000, 18000, 24000])],
            'inverter' => ['nullable', Rule::in(['1'])],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0', 'gte:min_price'],
            'sort' => ['nullable', Rule::in(['popular', 'sale', 'price-low', 'price-high'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        if ($category->slug !== 'dieu-hoa') {
            unset($filters['btu'], $filters['inverter']);
        }

        $query = $catalog->activeProducts()->whereBelongsTo($category)->with([
            'category:id,name,slug', 'brand:id,name,slug',
            'images' => fn ($images) => $images->where('is_primary', true)->orderBy('sort_order'),
        ]);
        $catalog->applySort($catalog->applyFilters($query, $filters), $filters['sort'] ?? 'popular');
        $products = $query->paginate(12)->withQueryString();
        $productItems = $products->through(fn ($product) => $catalog->card($product));

        $hasFacets = Arr::hasAny($filters, ['q', 'brand', 'btu', 'inverter', 'min_price', 'max_price', 'sort']);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $categoryUrl = route('categories.show', $category);
        $canonical = $category->canonical_url ?: $categoryUrl;
        if (! $hasFacets && $page > 1) {
            $canonical .= '?page='.$page;
        }

        $title = $category->seo_title ?: $category->name.' chính hãng, giá tốt | Điện Máy 365';
        if (! $hasFacets && $page > 1) {
            $title .= ' – Trang '.$page;
        }
        $description = $category->seo_description ?: $category->description;
        $items = $productItems->getCollection();
        $breadcrumbs = [['name' => 'Trang chủ', 'url' => route('home')], ['name' => $category->name, 'url' => $categoryUrl]];
        $brands = Brand::query()->where('status', 'active')
            ->whereHas('products', fn ($products) => $products->whereBelongsTo($category)->where('status', 'active'))
            ->withCount(['products' => fn ($products) => $products->whereBelongsTo($category)->where('status', 'active')])
            ->orderBy('name')->get(['id', 'name', 'slug']);

        return Inertia::render('Categories/Show', [
            'category' => [...$category->only(['id', 'name', 'slug', 'description']), 'url' => $categoryUrl, 'isAirConditioner' => $category->slug === 'dieu-hoa'],
            'products' => $productItems,
            'brands' => $brands,
            'filters' => (object) $filters,
            'seo' => ['title' => $title, 'description' => $description, 'canonical' => $canonical, 'image' => $items->first()['image']['url'] ?? null, 'ogTitle' => $category->og_title, 'ogDescription' => $category->og_description, 'ogImage' => $category->og_image, 'robots' => $hasFacets ? 'noindex,follow' : 'index,follow', 'ogType' => 'website'],
            'breadcrumbs' => $breadcrumbs,
            'jsonLd' => [
                'breadcrumbs' => ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => collect($breadcrumbs)->map(fn ($item, $index) => ['@type' => 'ListItem', 'position' => $index + 1, 'name' => $item['name'], 'item' => $item['url']])->all()],
                'collection' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => $category->name, 'description' => $description, 'url' => $canonical, 'mainEntity' => ['@type' => 'ItemList', 'numberOfItems' => $items->count(), 'itemListElement' => $items->values()->map(fn ($product, $index) => ['@type' => 'ListItem', 'position' => ($products->firstItem() ?? 1) + $index, 'url' => $product['url'], 'name' => $product['name']])->all()]],
            ],
        ]);
    }
}
