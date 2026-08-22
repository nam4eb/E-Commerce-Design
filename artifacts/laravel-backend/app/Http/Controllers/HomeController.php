<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Models\Brand;
use App\Models\Category;
use App\Services\CatalogQuery;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(CatalogQuery $catalog): Response
    {
        $categories = Category::query()->where('status', 'active')
            ->withCount(['products' => fn ($query) => $query->where('status', 'active')->where('is_available', true)])
            ->orderBy('sort_order')->get();
        $products = $catalog->activeProducts()->with(['brand', 'category', 'images'])
            ->orderByDesc('sold_count')->orderByDesc('id')->get();
        $cards = fn ($items) => $items->map(fn ($product) => $catalog->card($product))->values();

        return Inertia::render('Home', [
            'heroProduct' => optional($products->first(fn ($product) => $product->category->slug === 'dieu-hoa'), fn ($product) => $catalog->card($product)),
            'categories' => $categories->map(fn (Category $category) => [...$category->only(['name', 'slug', 'description', 'image']), 'product_count' => $category->products_count, 'url' => route('categories.show', $category)]),
            'saleProducts' => $cards($products->filter(fn ($product) => $product->original_price && $product->currentPrice() < $product->original_price)->take(6)),
            'bestSellers' => $cards($products->take(10)),
            'categorySections' => collect(['tu-lanh', 'may-giat', 'tivi', 'do-gia-dung'])->map(function (string $slug) use ($categories, $products, $cards) {
                $category = $categories->firstWhere('slug', $slug);

                return $category ? ['category' => ['name' => $category->name, 'url' => route('categories.show', $category), 'description' => $category->description], 'products' => $cards($products->where('category_id', $category->id)->take(5))] : null;
            })->filter()->values(),
            'brands' => Brand::query()->where('status', 'active')->withCount(['products' => fn ($query) => $query->where('status', 'active')])->orderByDesc('products_count')->get()->map(fn (Brand $brand) => [...$brand->only(['name', 'slug', 'logo']), 'product_count' => $brand->products_count, 'url' => route('brands.show', $brand)]),
            'articles' => Article::query()->where('status', ArticleStatus::Published)->whereNotNull('published_at')->where('published_at', '<=', now())->latest('published_at')->take(3)->get()->map(fn (Article $article) => [...$article->only(['title', 'excerpt', 'featured_image']), 'published_at' => $article->published_at?->toDateString(), 'url' => route('articles.show', $article)]),
        ]);
    }
}
