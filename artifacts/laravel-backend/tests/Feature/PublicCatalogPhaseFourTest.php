<?php

namespace Tests\Feature;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicCatalogPhaseFourTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_all_approved_top_level_categories_are_indexable(): void
    {
        foreach (config('catalog.category_slugs') as $slug) {
            $this->get('/'.$slug)->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Categories/Show')->where('category.slug', $slug)->where('seo.robots', 'index,follow'));
        }
        $this->get('/danh-muc-khong-hop-le')->assertNotFound();
    }

    public function test_product_must_belong_to_category_in_url(): void
    {
        $slug = Product::where('sku', 'LG-GND372BL')->value('slug');
        $this->get('/tu-lanh/'.$slug)->assertOk();
        $this->get('/dieu-hoa/'.$slug)->assertNotFound();
    }

    public function test_brand_page_has_server_side_catalog_and_seo(): void
    {
        $this->get('/thuong-hieu/lg')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Brands/Show')->where('brand.slug', 'lg')->where('products.total', 5)
            ->where('seo.canonical', 'http://127.0.0.1:8000/thuong-hieu/lg')->where('seo.robots', 'index,follow')
            ->where('jsonLd.breadcrumbs.@type', 'BreadcrumbList'));
        $this->get('/thuong-hieu/lg?category=tu-lanh')->assertOk()->assertInertia(fn (Assert $page) => $page->where('seo.robots', 'noindex,follow'));
    }

    public function test_article_listing_and_detail_only_publish_visible_content(): void
    {
        $article = Article::where('status', ArticleStatus::Published)->firstOrFail();
        $this->get('/tin-tuc')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Articles/Index')->where('articles.total', 4));
        $this->get('/tin-tuc/'.$article->slug)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Articles/Show')->where('jsonLd.article.@type', 'Article')->where('jsonLd.breadcrumbs.@type', 'BreadcrumbList')->has('article.relatedProducts', 1));
        $draft = Article::create(['title' => 'Draft', 'slug' => 'draft', 'content' => 'Draft', 'status' => ArticleStatus::Draft]);
        $this->get('/tin-tuc/'.$draft->slug)->assertNotFound();
    }

    public function test_search_is_noindex_and_suggestions_exclude_inactive_products(): void
    {
        Product::where('sku', 'DAI-ATKF25XVMV')->update(['status' => 'inactive']);
        $this->get('/tim-kiem?q=Daikin')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Search/Index')->where('seo.robots', 'noindex,follow')->where('products.total', 1));
        $this->getJson('/api/v1/search/suggestions?q=Daikin')->assertOk()
            ->assertJsonCount(1, 'products')->assertJsonMissing(['sku' => 'DAI-ATKF25XVMV']);
        $this->getJson('/api/v1/search/suggestions?q=x')->assertUnprocessable();
    }

    public function test_public_catalog_queries_have_a_bounded_query_count(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->get('/dieu-hoa')->assertOk();
        $this->assertLessThanOrEqual(15, count(DB::getQueryLog()));
    }

    public function test_sitemap_includes_all_public_types_but_not_search(): void
    {
        $this->get('/sitemap.xml')->assertOk()->assertSee('/tu-lanh', false)
            ->assertSee('/tu-lanh/tu-lanh-lg-inverter-374-lit-gn-d372bl', false)
            ->assertSee('/tin-tuc/cach-chon-cong-suat-dieu-hoa-phu-hop-dien-tich-phong', false)
            ->assertDontSee('/tim-kiem', false)->assertDontSee('?q=', false);
    }
}
