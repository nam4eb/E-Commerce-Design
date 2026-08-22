<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $categories = Category::query()->where('status', 'active')->whereIn('slug', config('catalog.category_slugs'))->get(['id', 'slug', 'canonical_url', 'updated_at']);
        $products = Product::query()->where('status', 'active')->with('category:id,slug')->whereHas('category', fn ($query) => $query->whereIn('slug', config('catalog.category_slugs'))->where('status', 'active'))->get(['id', 'category_id', 'slug', 'canonical_url', 'updated_at']);
        $brands = Brand::query()->where('status', 'active')->whereHas('products', fn ($query) => $query->where('status', 'active'))->get(['id', 'slug', 'canonical_url', 'updated_at']);
        $articles = Article::query()->where('status', 'published')->where('published_at', '<=', now())->get(['id', 'slug', 'canonical_url', 'updated_at']);

        return response()->view('sitemap', compact('categories', 'products', 'brands', 'articles'))
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}
