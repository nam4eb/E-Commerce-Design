<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Services\CatalogQuery;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['page' => ['nullable', 'integer', 'min:1']]);
        $articles = Article::query()->where('status', ArticleStatus::Published)->where('published_at', '<=', now())
            ->with('author:id,name')->latest('published_at')->paginate(12)->withQueryString()
            ->through(fn (Article $article) => [...$article->only(['id', 'title', 'slug', 'excerpt', 'featured_image', 'published_at', 'updated_at']), 'author' => $article->author?->only(['name']), 'url' => route('articles.show', $article)]);
        $page = max(1, (int) ($filters['page'] ?? 1));
        $canonical = route('articles.index').($page > 1 ? '?page='.$page : '');
        $title = 'Tin tức điện máy và kinh nghiệm mua sắm | Điện Máy 365'.($page > 1 ? ' – Trang '.$page : '');

        return Inertia::render('Articles/Index', [
            'articles' => $articles,
            'seo' => ['title' => $title, 'description' => 'Tin tức điện máy, hướng dẫn chọn mua và sử dụng thiết bị gia dụng hiệu quả.', 'canonical' => $canonical, 'robots' => 'index,follow', 'ogType' => 'website'],
            'breadcrumbs' => [['name' => 'Trang chủ', 'url' => route('home')], ['name' => 'Tin tức', 'url' => route('articles.index')]],
        ]);
    }

    public function show(Article $article, CatalogQuery $catalog): Response
    {
        abort_unless($article->status === ArticleStatus::Published && $article->published_at?->isPast(), 404);
        $article->load(['author:id,name', 'products' => fn ($query) => $query->where('status', 'active')->with(['category:id,name,slug', 'brand:id,name,slug', 'images' => fn ($images) => $images->where('is_primary', true)])]);
        $canonical = $article->canonical_url ?: route('articles.show', $article);
        $title = $article->seo_title ?: $article->title.' | Điện Máy 365';
        $description = $article->seo_description ?: $article->excerpt;
        $breadcrumbs = [['name' => 'Trang chủ', 'url' => route('home')], ['name' => 'Tin tức', 'url' => route('articles.index')], ['name' => $article->title, 'url' => $canonical]];

        return Inertia::render('Articles/Show', [
            'article' => [...$article->only(['id', 'title', 'slug', 'excerpt', 'content', 'featured_image', 'published_at', 'updated_at']), 'author' => $article->author?->only(['name']), 'relatedProducts' => $article->products->map(fn ($product) => $catalog->card($product))->values()],
            'seo' => ['title' => $title, 'description' => $description, 'canonical' => $canonical, 'image' => $article->og_image ?: $article->featured_image, 'ogTitle' => $article->og_title, 'ogDescription' => $article->og_description, 'ogImage' => $article->og_image, 'robots' => 'index,follow', 'ogType' => 'article'],
            'breadcrumbs' => $breadcrumbs,
            'jsonLd' => [
                'article' => array_filter(['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $article->title, 'description' => $description, 'image' => $article->featured_image, 'datePublished' => $article->published_at?->toAtomString(), 'dateModified' => $article->updated_at->toAtomString(), 'author' => $article->author ? ['@type' => 'Person', 'name' => $article->author->name] : ['@type' => 'Organization', 'name' => 'Điện Máy 365'], 'mainEntityOfPage' => $canonical]),
                'breadcrumbs' => ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => collect($breadcrumbs)->map(fn ($item, $index) => ['@type' => 'ListItem', 'position' => $index + 1, 'name' => $item['name'], 'item' => $item['url']])->all()],
            ],
        ]);
    }
}
