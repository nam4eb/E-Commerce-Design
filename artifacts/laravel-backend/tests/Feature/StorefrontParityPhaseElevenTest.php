<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontParityPhaseElevenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_active_promotions_have_a_public_indexable_page_with_eligible_products(): void
    {
        $this->get('/khuyen-mai')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Promotions/Index')
            ->has('promotions', 1)
            ->where('promotions.0.name', 'Ưu đãi điều hòa mùa nóng')
            ->has('promotions.0.products', 6)
            ->where('seo.canonical', 'http://127.0.0.1:8000/khuyen-mai')
            ->where('seo.robots', 'index,follow')
            ->where('jsonLd.breadcrumbs.@type', 'BreadcrumbList'));

        $this->get('/sitemap.xml')->assertOk()->assertSee('/khuyen-mai', false);
    }

    public function test_compare_page_is_public_but_not_indexable(): void
    {
        $this->get('/so-sanh')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Compare/Index'));

        $this->get('/sitemap.xml')->assertOk()->assertDontSee('/so-sanh', false);
    }

    public function test_product_props_contain_the_client_side_compare_snapshot(): void
    {
        $this->get('/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Products/Show')
            ->where('product.sku', 'DAI-ATKF35XVMV')
            ->where('product.category.name', 'Điều hòa')
            ->has('product.image.url')
            ->where('product.url', 'http://127.0.0.1:8000/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv'));
    }
}
