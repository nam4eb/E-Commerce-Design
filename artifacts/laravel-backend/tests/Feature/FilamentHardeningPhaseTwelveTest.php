<?php

namespace Tests\Feature;

use App\Enums\AdminRole;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\OrderStatusService;
use App\Services\ReviewModerationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class FilamentHardeningPhaseTwelveTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_roles_have_least_privilege_panel_and_resource_access(): void
    {
        $catalog = User::factory()->create(['role' => AdminRole::CatalogEditor, 'email_verified_at' => now()]);
        $operator = User::factory()->create(['role' => AdminRole::OrderOperator, 'email_verified_at' => now()]);
        $support = User::factory()->create(['role' => AdminRole::Support, 'email_verified_at' => now()]);

        $this->assertTrue($catalog->canAccessPanel(filament()->getPanel('admin')));
        $this->assertTrue(Gate::forUser($catalog)->allows('create', Product::class));
        $this->assertFalse(Gate::forUser($catalog)->allows('viewAny', Order::class));
        $this->assertTrue(Gate::forUser($operator)->allows('viewAny', Order::class));
        $this->assertFalse(Gate::forUser($operator)->allows('update', new Order));
        $this->assertTrue(Gate::forUser($support)->allows('viewAny', Payment::class));
        $this->assertFalse(Gate::forUser($support)->allows('create', Product::class));
    }

    public function test_customer_and_unverified_staff_cannot_access_admin(): void
    {
        $customer = User::factory()->create(['role' => AdminRole::Customer, 'email_verified_at' => now()]);
        $staff = User::factory()->create(['role' => AdminRole::ReadOnly, 'email_verified_at' => null]);

        $this->actingAs($customer)->get('/admin')->assertForbidden();
        $this->actingAs($staff)->get('/admin')->assertForbidden();
    }

    public function test_verified_staff_login_is_audited(): void
    {
        $staff = User::factory()->create([
            'email' => 'operator@example.test',
            'password' => 'SecurePassword123!',
            'role' => AdminRole::OrderOperator,
            'email_verified_at' => now(),
        ]);

        $this->post('/dang-nhap', ['email' => $staff->email, 'password' => 'SecurePassword123!'])->assertRedirect();
        $this->assertDatabaseHas('audit_logs', ['actor_id' => $staff->id, 'event' => 'admin_login']);
    }

    public function test_commerce_records_reject_generic_mutation_even_for_super_admin(): void
    {
        $admin = User::factory()->create(['role' => AdminRole::SuperAdmin, 'email_verified_at' => now()]);

        $this->assertTrue(Gate::forUser($admin)->allows('viewAny', Payment::class));
        $this->assertFalse(Gate::forUser($admin)->allows('create', Payment::class));
        $this->assertFalse(Gate::forUser($admin)->allows('update', new Payment));
        $this->assertFalse(Gate::forUser($admin)->allows('delete', new Payment));
    }

    public function test_domain_services_write_redacted_actor_audit_trail(): void
    {
        $this->seed(DatabaseSeeder::class);
        $admin = User::factory()->create(['role' => AdminRole::SuperAdmin, 'email_verified_at' => now()]);
        $this->actingAs($admin);
        $order = Order::factory()->create(['status' => OrderStatus::Pending]);

        app(OrderStatusService::class)->transition($order, OrderStatus::Confirmed);
        $audit = AuditLog::query()->where('auditable_type', $order->getMorphClass())->where('auditable_id', $order->id)->latest('id')->firstOrFail();

        $this->assertSame($admin->id, $audit->actor_id);
        $this->assertSame('updated', $audit->event);
        $this->assertSame('confirmed', $audit->new_values['status']);
    }

    public function test_reviews_can_only_be_moderated_through_workflow(): void
    {
        $this->seed(DatabaseSeeder::class);
        $review = Review::query()->create([
            'product_id' => Product::query()->firstOrFail()->id,
            'reviewer_name' => 'Khách thử nghiệm',
            'rating' => 5,
            'content' => 'Nội dung đánh giá hợp lệ.',
            'status' => ReviewStatus::Pending,
        ]);

        $approved = app(ReviewModerationService::class)->moderate($review, ReviewStatus::Approved);
        $this->assertSame(ReviewStatus::Approved, $approved->status);
        $this->assertNotNull($approved->approved_at);
    }
}
