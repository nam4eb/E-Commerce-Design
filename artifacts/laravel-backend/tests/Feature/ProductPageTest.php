<?php

namespace Tests\Feature;

use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_product_page_is_available(): void
    {
        $this->get('/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Products/Show')
                ->where('product.name', 'Điều hòa Daikin Inverter 1.5 HP ATKF35XVMV')
                ->where('seo.title', 'Điều hòa Daikin 12000 BTU ATKF35XVMV giá tốt')
                ->where('jsonLd.product.@type', 'Product')
                ->where('jsonLd.breadcrumbs.@type', 'BreadcrumbList'));
    }

    public function test_unknown_catalog_entities_return_404(): void
    {
        $this->get('/dieu-hoa/khong-ton-tai')->assertNotFound();
        $this->get('/thuong-hieu/khong-ton-tai')->assertNotFound();
        $this->get('/products?id=unknown')->assertNotFound();
    }

    public function test_resolvable_legacy_id_redirects_permanently(): void
    {
        $this->get('/products?id=ac-02')
            ->assertStatus(301)
            ->assertRedirect('/dieu-hoa/daikin-inverter-1-5-hp-atkf35xvmv');
    }
}
