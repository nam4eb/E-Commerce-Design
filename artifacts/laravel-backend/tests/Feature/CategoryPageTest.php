<?php

namespace Tests\Feature;

use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CategoryPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_category_page_exposes_products_and_indexable_seo(): void
    {
        $this->get('/dieu-hoa')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Categories/Show')
            ->where('category.slug', 'dieu-hoa')
            ->where('products.total', 6)
            ->has('products.data', 6)
            ->has('brands', 5)
            ->where('seo.canonical', 'http://127.0.0.1:8000/dieu-hoa')
            ->where('seo.robots', 'index,follow')
            ->where('jsonLd.breadcrumbs.@type', 'BreadcrumbList')
            ->where('jsonLd.collection.@type', 'CollectionPage'));
    }

    public function test_category_filters_and_sort_are_applied_server_side(): void
    {
        $this->get('/dieu-hoa?brand=daikin&btu=12000&sort=price-low')
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.sku', 'DAI-ATKF35XVMV')
            ->where('seo.canonical', 'http://127.0.0.1:8000/dieu-hoa')
            ->where('seo.robots', 'noindex,follow'));
    }

    public function test_invalid_filter_does_not_create_indexable_content(): void
    {
        $this->get('/dieu-hoa?brand=khong-ton-tai')->assertSessionHasErrors('brand');
    }

    public function test_sitemap_and_robots_only_expose_canonical_public_routes(): void
    {
        $this->get('/sitemap.xml')->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv', false)
            ->assertDontSee('/products?id=', false)
            ->assertDontSee('/cart', false);

        $this->get('/robots.txt')->assertOk()
            ->assertSee('Sitemap: http://127.0.0.1:8000/sitemap.xml', false)
            ->assertSee('Disallow: /gio-hang', false)
            ->assertSee('Disallow: /thanh-toan', false);
    }
}
