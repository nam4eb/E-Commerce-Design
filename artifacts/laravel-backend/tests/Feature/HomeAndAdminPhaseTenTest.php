<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeAndAdminPhaseTenTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_receives_complete_server_side_catalog_content(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Home')->has('categories', 8)->has('saleProducts', 6)
            ->has('bestSellers', 10)->has('categorySections', 4)->has('brands', 10)->has('articles', 3));
    }

    public function test_admin_panel_rejects_customers_and_accepts_verified_admins(): void
    {
        $customer = User::factory()->create(['role' => 'customer', 'email_verified_at' => now()]);
        $admin = User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        $this->get('/admin')->assertRedirect();
        $this->actingAs($customer)->get('/admin')->assertForbidden();
        $this->actingAs($admin)->get('/admin')->assertRedirect();
    }
}
