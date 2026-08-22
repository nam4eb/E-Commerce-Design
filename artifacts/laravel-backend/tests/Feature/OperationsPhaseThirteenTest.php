<?php

namespace Tests\Feature;

use App\Enums\CartStatus;
use App\Enums\ReviewStatus;
use App\Jobs\GenerateProductImageVariants;
use App\Models\Cart;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\Setting;
use App\Models\User;
use App\Services\SettingsRepository;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OperationsPhaseThirteenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_customer_review_is_pending_and_not_published_until_approved(): void
    {
        $user = User::factory()->create();
        $product = Product::query()->where('slug', 'daikin-inverter-1-5-hp-atkf35xvmv')->firstOrFail();

        $this->actingAs($user)->post(route('reviews.store', $product), [
            'rating' => 5,
            'title' => 'Sản phẩm vận hành tốt',
            'content' => 'Máy làm lạnh nhanh, chạy êm và đúng với nội dung được mô tả.',
        ])->assertRedirect();

        $review = Review::sole();
        $this->assertSame(ReviewStatus::Pending, $review->status);
        $this->assertNull($review->verified_at);
        $this->get(route('products.show', [$product->category, $product]))
            ->assertDontSee('Sản phẩm vận hành tốt');

        $review->update(['status' => ReviewStatus::Approved, 'approved_at' => now()]);
        $this->get(route('products.show', [$product->category, $product]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reviews.0.title', 'Sản phẩm vận hành tốt')
                ->where('jsonLd.product.aggregateRating.@type', 'AggregateRating'));
    }

    public function test_resubmitting_updates_the_existing_review(): void
    {
        $user = User::factory()->create();
        $product = Product::query()->firstOrFail();
        $payload = ['rating' => 4, 'title' => 'Đánh giá lần đầu', 'content' => 'Nội dung đánh giá đủ dài để hệ thống chấp nhận và kiểm duyệt.'];

        $this->actingAs($user)->post(route('reviews.store', $product), $payload);
        $this->actingAs($user)->post(route('reviews.store', $product), [...$payload, 'rating' => 5]);

        $this->assertDatabaseCount('reviews', 1);
        $this->assertSame(5, Review::sole()->rating);
    }

    public function test_settings_cache_is_invalidated_after_update(): void
    {
        $setting = Setting::create(['key' => 'phase13.flag', 'value' => 'false', 'type' => 'boolean']);
        $settings = app(SettingsRepository::class);
        $this->assertFalse($settings->get('phase13.flag'));

        $setting->update(['value' => 'true']);
        $this->assertTrue($settings->get('phase13.flag'));
    }

    public function test_scheduled_maintenance_commands_are_idempotent(): void
    {
        $promotion = Promotion::factory()->create(['is_active' => true, 'ends_at' => now()->subMinute()]);
        $cart = Cart::factory()->create(['status' => CartStatus::Active, 'expires_at' => now()->subMinute()]);

        $this->artisan('commerce:expire-promotions')->assertSuccessful();
        $this->artisan('commerce:prune-carts')->assertSuccessful();
        $this->artisan('commerce:expire-promotions')->assertSuccessful();

        $this->assertFalse($promotion->fresh()->is_active);
        $this->assertSame(CartStatus::Abandoned, $cart->fresh()->status);
    }

    public function test_local_product_image_generates_responsive_webp_metadata(): void
    {
        Storage::fake('public');
        config(['media.disk' => 'public', 'media.variant_widths' => [2]]);
        $canvas = imagecreatetruecolor(4, 2);
        ob_start();
        imagepng($canvas);
        $contents = ob_get_clean();
        imagedestroy($canvas);
        Storage::disk('public')->put('products/gallery/test.png', $contents);

        $image = ProductImage::create(['product_id' => Product::query()->firstOrFail()->id, 'url' => 'products/gallery/test.png', 'alt_text' => 'Ảnh kiểm thử']);
        (new GenerateProductImageVariants($image->id))->handle();

        $image->refresh();
        $this->assertSame(4, $image->width);
        $this->assertSame(2, $image->height);
        $this->assertArrayHasKey('2', $image->variants);
        Storage::disk('public')->assertExists($image->variants['2']);
    }
}
