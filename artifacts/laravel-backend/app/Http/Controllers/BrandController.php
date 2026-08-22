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

class BrandController extends Controller
{
    public function show(Request $request, Brand $brand, CatalogQuery $catalog): Response
    {
        abort_unless($brand->status === 'active', 404);
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', Rule::exists('categories', 'slug')->where('status', 'active')],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0', 'gte:min_price'],
            'sort' => ['nullable', Rule::in(['popular', 'sale', 'price-low', 'price-high'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = $catalog->activeProducts()->whereBelongsTo($brand)->with([
            'category:id,name,slug', 'brand:id,name,slug',
            'images' => fn ($images) => $images->where('is_primary', true)->orderBy('sort_order'),
        ]);
        $catalog->applySort($catalog->applyFilters($query, $filters), $filters['sort'] ?? 'popular');
        $products = $query->paginate(12)->withQueryString()->through(fn ($product) => $catalog->card($product));
        $hasFacets = Arr::hasAny($filters, ['q', 'category', 'min_price', 'max_price', 'sort']);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $baseUrl = route('brands.show', $brand);
        $canonical = $brand->canonical_url ?: $baseUrl;
        if (! $hasFacets && $page > 1) {
            $canonical .= '?page='.$page;
        }
        $title = $brand->seo_title ?: 'Sản phẩm '.$brand->name.' chính hãng | Điện Máy 365';
        if (! $hasFacets && $page > 1) {
            $title .= ' – Trang '.$page;
        }
        $description = $brand->seo_description ?: $brand->description;
        $breadcrumbs = [['name' => 'Trang chủ', 'url' => route('home')], ['name' => 'Thương hiệu '.$brand->name, 'url' => $baseUrl]];
        $categories = Category::query()->where('status', 'active')->whereIn('slug', config('catalog.category_slugs'))
            ->whereHas('products', fn ($query) => $query->whereBelongsTo($brand)->where('status', 'active'))
            ->withCount(['products' => fn ($query) => $query->whereBelongsTo($brand)->where('status', 'active')])->orderBy('sort_order')->get(['id', 'name', 'slug']);

        return Inertia::render('Brands/Show', [
            'brand' => [...$brand->only(['id', 'name', 'slug', 'description', 'logo']), 'url' => $baseUrl],
            'products' => $products,
            'categories' => $categories,
            'filters' => (object) $filters,
            'seo' => ['title' => $title, 'description' => $description, 'canonical' => $canonical, 'image' => $brand->og_image ?: $brand->logo, 'ogTitle' => $brand->og_title, 'ogDescription' => $brand->og_description, 'ogImage' => $brand->og_image, 'robots' => $hasFacets ? 'noindex,follow' : 'index,follow', 'ogType' => 'website'],
            'breadcrumbs' => $breadcrumbs,
            'jsonLd' => [
                'breadcrumbs' => ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => collect($breadcrumbs)->map(fn ($item, $index) => ['@type' => 'ListItem', 'position' => $index + 1, 'name' => $item['name'], 'item' => $item['url']])->all()],
                'collection' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'Thương hiệu '.$brand->name, 'description' => $description, 'url' => $canonical],
            ],
        ]);
    }
}
