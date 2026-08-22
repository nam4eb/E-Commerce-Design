<?php

namespace Tests\Feature;

use App\Enums\CartStatus;
use App\Models\Cart;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartAndWishlistPhaseSixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_guest_cart_is_database_backed_and_ignores_client_price(): void
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $response = $this->post('/gio-hang/items', ['product_id' => $product->id, 'quantity' => 2, 'price' => 1]);
        $response->assertRedirect()->assertCookie(config('commerce.guest_cart_cookie'));
        $cart = Cart::whereNull('user_id')->firstOrFail();
        $this->assertNotNull($cart->guest_token);
        $this->assertDatabaseHas('cart_items', ['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 2]);
        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)->get('/gio-hang')
            ->assertOk()->assertInertia(fn ($page) => $page->component('Cart/Show')->where('cart.count', 2)->where('cart.items.0.unit_price', (int) $product->currentPrice()));
    }

    public function test_cart_add_is_additive_and_cannot_exceed_stock(): void
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $product->update(['stock' => 3]);
        $cart = Cart::create(['guest_token' => fake()->uuid(), 'status' => CartStatus::Active]);
        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/gio-hang/items', ['product_id' => $product->id, 'quantity' => 2])->assertSessionHasNoErrors();
        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/gio-hang/items', ['product_id' => $product->id, 'quantity' => 2])->assertSessionHasNoErrors();
        $this->assertSame(3, $cart->items()->firstOrFail()->quantity);
        $this->withCookie(config('commerce.guest_cart_cookie'), $cart->guest_token)
            ->post('/gio-hang/items', ['product_id' => $product->id, 'quantity' => 4])->assertSessionHasErrors('quantity');
    }

    public function test_guest_cannot_mutate_another_guest_cart_item(): void
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $owner = Cart::create(['guest_token' => fake()->uuid(), 'status' => CartStatus::Active]);
        $other = Cart::create(['guest_token' => fake()->uuid(), 'status' => CartStatus::Active]);
        $item = $owner->items()->create(['product_id' => $product->id, 'quantity' => 1]);
        $this->withCookie(config('commerce.guest_cart_cookie'), $other->guest_token)
            ->patch("/gio-hang/items/{$item->id}", ['quantity' => 2])->assertNotFound();
        $this->assertSame(1, $item->fresh()->quantity);
    }

    public function test_guest_cart_merges_into_authenticated_cart_on_login(): void
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $product->update(['stock' => 5]);
        $user = User::factory()->create(['email' => 'buyer@example.test', 'password' => 'password123']);
        $userCart = Cart::create(['user_id' => $user->id, 'status' => CartStatus::Active]);
        $userCart->items()->create(['product_id' => $product->id, 'quantity' => 2]);
        $guest = Cart::create(['guest_token' => fake()->uuid(), 'status' => CartStatus::Active]);
        $guest->items()->create(['product_id' => $product->id, 'quantity' => 4]);
        $this->withCookie(config('commerce.guest_cart_cookie'), $guest->guest_token)
            ->post('/dang-nhap', ['email' => $user->email, 'password' => 'password123'])
            ->assertRedirect(route('account.index'))->assertCookieExpired(config('commerce.guest_cart_cookie'));
        $this->assertSame(5, $userCart->items()->firstOrFail()->fresh()->quantity);
        $this->assertSame(CartStatus::Converted, $guest->fresh()->status);
    }

    public function test_unavailable_product_cannot_be_added(): void
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $product->update(['is_available' => false]);
        $this->post('/gio-hang/items', ['product_id' => $product->id, 'quantity' => 1])->assertSessionHasErrors('product_id');
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_wishlist_is_authenticated_idempotent_and_user_scoped(): void
    {
        $product = Product::where('status', 'active')->firstOrFail();
        $user = User::factory()->create();
        $this->put("/yeu-thich/{$product->slug}")->assertRedirect(route('login'));
        $this->actingAs($user)->put("/yeu-thich/{$product->slug}")->assertRedirect();
        $this->actingAs($user)->put("/yeu-thich/{$product->slug}")->assertRedirect();
        $this->assertDatabaseCount('wishlists', 1);
        $this->actingAs($user)->get('/tai-khoan/yeu-thich')->assertOk()->assertInertia(fn ($page) => $page->component('Account/Wishlist')->has('products', 1));
        $this->actingAs($user)->delete("/yeu-thich/{$product->slug}")->assertRedirect();
        $this->assertDatabaseCount('wishlists', 0);
    }
}
