<?php echo '<?xml version="1.0" encoding="UTF-8"?>'; ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>{{ route('home') }}</loc></url>
    <url><loc>{{ route('articles.index') }}</loc></url>
    <url><loc>{{ route('promotions.index') }}</loc></url>
    @foreach ($categories as $category)
        <url><loc>{{ $category->canonical_url ?: route('categories.show', $category) }}</loc><lastmod>{{ $category->updated_at->toAtomString() }}</lastmod></url>
    @endforeach
    @foreach ($products as $product)
        <url><loc>{{ $product->canonical_url ?: route('products.show', [$product->category, $product]) }}</loc><lastmod>{{ $product->updated_at->toAtomString() }}</lastmod></url>
    @endforeach
    @foreach ($brands as $brand)
        <url><loc>{{ $brand->canonical_url ?: route('brands.show', $brand) }}</loc><lastmod>{{ $brand->updated_at->toAtomString() }}</lastmod></url>
    @endforeach
    @foreach ($articles as $article)
        <url><loc>{{ $article->canonical_url ?: route('articles.show', $article) }}</loc><lastmod>{{ $article->updated_at->toAtomString() }}</lastmod></url>
    @endforeach
</urlset>
