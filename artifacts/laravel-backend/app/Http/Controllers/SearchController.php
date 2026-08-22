<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Services\CatalogQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function index(Request $request, CatalogQuery $catalog): Response
    {
        $filters = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = $catalog->activeProducts()->with(['category:id,name,slug', 'brand:id,name,slug', 'images' => fn ($images) => $images->where('is_primary', true)]);
        $catalog->applySort($catalog->applyFilters($query, $filters), 'popular');
        $products = $query->paginate(12)->withQueryString()->through(fn ($product) => $catalog->card($product));
        $canonical = route('search', ['q' => $filters['q']]);

        return Inertia::render('Search/Index', [
            'query' => $filters['q'],
            'products' => $products,
            'seo' => ['title' => 'Kết quả tìm kiếm cho “'.$filters['q'].'” | Điện Máy 365', 'description' => 'Tìm sản phẩm điện máy phù hợp tại Điện Máy 365.', 'canonical' => $canonical, 'robots' => 'noindex,follow', 'ogType' => 'website'],
        ]);
    }

    public function suggestions(Request $request): JsonResponse
    {
        $search = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q'];
        $like = '%'.$search.'%';
        $products = Product::query()->where('status', 'active')->where('is_available', true)
            ->where(fn ($query) => $query->where('name', 'like', $like)->orWhere('sku', 'like', $like))
            ->with('category:id,name,slug')->limit(5)->get(['id', 'category_id', 'name', 'slug', 'sku'])
            ->map(fn ($product) => [...$product->only(['name', 'sku']), 'url' => route('products.show', [$product->category, $product])]);
        $categories = Category::query()->where('status', 'active')->whereIn('slug', config('catalog.category_slugs'))->where('name', 'like', $like)->limit(5)->get(['id', 'name', 'slug'])->map(fn ($category) => [...$category->only(['name']), 'url' => route('categories.show', $category)]);
        $brands = Brand::query()->where('status', 'active')->where('name', 'like', $like)->whereHas('products', fn ($query) => $query->where('status', 'active'))->limit(5)->get(['id', 'name', 'slug'])->map(fn ($brand) => [...$brand->only(['name']), 'url' => route('brands.show', $brand)]);

        return response()->json(compact('products', 'categories', 'brands'));
    }
}
