<?php

namespace Tests\Feature;

use App\Enums\AdminRole;
use App\Filament\Pages\Dashboard;
use App\Filament\Pages\RoleMatrix;
use App\Filament\Resources\AuditLogs\AuditLogResource;
use App\Filament\Resources\CustomerRequests\CustomerRequestResource;
use App\Filament\Resources\Settings\SettingResource;
use App\Filament\Resources\Users\UserResource;
use App\Filament\Widgets\BestSellingProducts;
use App\Models\CustomerRequest;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Review;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Livewire\Livewire;
use Tests\TestCase;

class FilamentDashboardExpansionTest extends TestCase
{
    use RefreshDatabase;

    protected function defineEnvironment($app): void
    {
        $app['config']->set('security.admin_mfa_required', false);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dashboard_foundation_and_demo_reporting_data_are_available(): void
    {
        $this->assertTrue(Schema::hasColumns('customer_requests', ['type', 'status', 'assigned_to', 'resolved_at']));
        $this->assertGreaterThanOrEqual(36, Order::count());
        $this->assertGreaterThanOrEqual(19, User::where('role', AdminRole::Customer)->count());
        $this->assertGreaterThanOrEqual(12, Review::where('status', 'approved')->count());
        $this->assertGreaterThan(0, Payment::where('provider', 'demo')->count());
        $this->assertGreaterThan(0, Shipment::where('provider', 'demo')->count());
        $this->assertSame(2, CustomerRequest::count());

        $admin = User::where('role', AdminRole::SuperAdmin)->firstOrFail();
        $this->actingAs($admin);
        Livewire::test(Dashboard::class)->assertOk()->assertSee('Bộ lọc báo cáo');
        $bestSellers = Livewire::test(BestSellingProducts::class)->assertOk();
        $this->assertFalse($bestSellers->instance()->getTable()->hasDefaultKeySort());
        Livewire::test(RoleMatrix::class)->assertOk()->assertSee('Ma trận vai trò và quyền hạn');
        $this->assertTrue(AuditLogResource::canViewAny());
    }

    public function test_sensitive_navigation_and_customer_request_permissions_follow_roles(): void
    {
        $support = User::factory()->create(['role' => AdminRole::Support, 'email_verified_at' => now()]);
        $request = CustomerRequest::firstOrFail();

        $this->actingAs($support);
        $this->assertTrue(CustomerRequestResource::canViewAny());
        $this->assertTrue(CustomerRequestResource::canEdit($request));
        $this->assertFalse(UserResource::canViewAny());
        $this->assertFalse(SettingResource::canViewAny());
        $this->assertFalse(AuditLogResource::canViewAny());
        $this->assertFalse(RoleMatrix::canAccess());
    }
}
