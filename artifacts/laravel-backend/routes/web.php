<?php

use App\Http\Controllers\ArticleController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CheckoutValidationController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\ReadinessController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\ShippingWebhookController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\WishlistController;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

require __DIR__.'/auth.php';

Route::get('/', HomeController::class)->name('home');
Route::get('/ready', ReadinessController::class)->name('ready');
Route::get('/thuong-hieu/{brand}', [BrandController::class, 'show'])->name('brands.show');
Route::get('/tin-tuc', [ArticleController::class, 'index'])->name('articles.index');
Route::get('/tin-tuc/{article}', [ArticleController::class, 'show'])->name('articles.show');
Route::get('/khuyen-mai', [PromotionController::class, 'index'])->name('promotions.index');
Route::get('/so-sanh', fn () => Inertia::render('Compare/Index'))->name('compare.index');
Route::get('/tim-kiem', [SearchController::class, 'index'])->name('search');
Route::get('/api/v1/search/suggestions', [SearchController::class, 'suggestions'])->middleware('throttle:30,1')->name('api.search.suggestions');
Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');
Route::get('/gio-hang', [CartController::class, 'show'])->name('cart.show');
Route::post('/gio-hang/items', [CartController::class, 'store'])->middleware('throttle:60,1')->name('cart.items.store');
Route::patch('/gio-hang/items/{cartItem}', [CartController::class, 'update'])->middleware('throttle:60,1')->name('cart.items.update');
Route::delete('/gio-hang/items/{cartItem}', [CartController::class, 'destroy'])->middleware('throttle:60,1')->name('cart.items.destroy');
Route::post('/gio-hang/coupon', [CartController::class, 'applyCoupon'])->middleware('throttle:20,1')->name('cart.coupon.store');
Route::delete('/gio-hang/coupon', [CartController::class, 'removeCoupon'])->name('cart.coupon.destroy');
Route::post('/api/v1/checkout/validate', CheckoutValidationController::class)->middleware('throttle:30,1')->name('api.checkout.validate');
Route::post('/api/v1/webhooks/payments/{provider}', PaymentWebhookController::class)->middleware(['webhook.secure', 'throttle:120,1'])->name('api.webhooks.payments');
Route::post('/api/v1/webhooks/shipments/{provider}', ShippingWebhookController::class)->middleware(['webhook.secure', 'throttle:120,1'])->name('api.webhooks.shipments');
Route::get('/thanh-toan', [CheckoutController::class, 'create'])->name('checkout.create');
Route::post('/thanh-toan', [CheckoutController::class, 'store'])->middleware('throttle:10,1')->name('checkout.store');
Route::get('/don-hang/{order:number}', [OrderController::class, 'show'])->name('orders.show');
Route::post('/don-hang/{order:number}/huy', [OrderController::class, 'cancel'])->middleware('throttle:5,1')->name('orders.cancel');
Route::middleware('auth')->group(function () {
    Route::post('/san-pham/{product}/danh-gia', [ReviewController::class, 'store'])->middleware('throttle:5,1')->name('reviews.store');
    Route::get('/tai-khoan/don-hang', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/tai-khoan/yeu-thich', [WishlistController::class, 'index'])->name('wishlist.index');
    Route::put('/yeu-thich/{product}', [WishlistController::class, 'store'])->middleware('throttle:60,1')->name('wishlist.store');
    Route::delete('/yeu-thich/{product}', [WishlistController::class, 'destroy'])->middleware('throttle:60,1')->name('wishlist.destroy');
});
Route::get('/robots.txt', fn () => response("User-agent: *\nAllow: /\nDisallow: /gio-hang\nDisallow: /thanh-toan\nDisallow: /tai-khoan\nDisallow: /dang-nhap\nDisallow: /dang-ky\nDisallow: /admin\nSitemap: ".route('sitemap')."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']))->name('robots');

Route::get('/products', function (Request $request) {
    abort_unless($request->filled('id'), 404);
    $product = Product::with('category')->where('legacy_id', $request->string('id'))->where('status', 'active')->firstOrFail();

    return redirect()->route('products.show', [$product->category, $product], 301);
})->name('legacy.products');

Route::get('/{category}/{product}', [ProductController::class, 'show'])
    ->whereIn('category', config('catalog.category_slugs'))
    ->name('products.show');
Route::get('/{category}', [CategoryController::class, 'show'])
    ->whereIn('category', config('catalog.category_slugs'))
    ->name('categories.show');
