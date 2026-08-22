<?php

namespace App\Services;

use App\Enums\CartStatus;
use App\Enums\ProductStatus;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Cookie\CookieJar;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function __construct(private readonly CookieJar $cookies) {}

    public function current(Request $request): ?Cart
    {
        $query = Cart::query()->where('status', CartStatus::Active)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()));
        if ($request->user()) {
            return $query->where('user_id', $request->user()->id)->latest()->first();
        }

        $token = $this->guestToken($request);

        return $token ? $query->where('guest_token', $token)->whereNull('user_id')->first() : null;
    }

    public function add(Request $request, array $data): Cart
    {
        return DB::transaction(function () use ($request, $data) {
            $product = Product::query()->lockForUpdate()->findOrFail($data['product_id']);
            $this->ensurePurchasable($product, (int) $data['quantity']);
            $cart = $this->resolveOrCreate($request);
            $required = (bool) ($data['installation_required'] ?? false);
            $item = $cart->items()->where('product_id', $product->id)->where('installation_required', $required)->lockForUpdate()->first();
            $quantity = min(($item?->quantity ?? 0) + (int) $data['quantity'], $product->stock, config('commerce.max_item_quantity'));
            if ($quantity < 1) {
                throw ValidationException::withMessages(['quantity' => 'Sản phẩm hiện không còn hàng.']);
            }
            ($item ?? new CartItem(['cart_id' => $cart->id, 'product_id' => $product->id, 'installation_required' => $required]))->fill([
                'quantity' => $quantity,
                'installation_notes' => $data['installation_notes'] ?? null,
            ])->save();

            return $cart;
        });
    }

    public function update(Request $request, CartItem $item, int $quantity): Cart
    {
        return DB::transaction(function () use ($request, $item, $quantity) {
            $item = CartItem::query()->with('product')->lockForUpdate()->findOrFail($item->id);
            $cart = $this->ownedCart($request, $item->cart_id);
            $this->ensurePurchasable($item->product, $quantity);
            $item->update(['quantity' => min($quantity, $item->product->stock, config('commerce.max_item_quantity'))]);

            return $cart;
        });
    }

    public function remove(Request $request, CartItem $item): Cart
    {
        return DB::transaction(function () use ($request, $item) {
            $item = CartItem::query()->lockForUpdate()->findOrFail($item->id);
            $cart = $this->ownedCart($request, $item->cart_id);
            $item->delete();

            return $cart;
        });
    }

    public function mergeGuestCart(Request $request, User $user): void
    {
        $token = $this->guestToken($request);
        if (! $token) {
            return;
        }

        DB::transaction(function () use ($token, $user) {
            User::query()->lockForUpdate()->findOrFail($user->id);
            $guest = Cart::query()->where('guest_token', $token)->whereNull('user_id')->where('status', CartStatus::Active)->with('items.product')->lockForUpdate()->first();
            if (! $guest) {
                return;
            }
            $cart = Cart::query()->where('user_id', $user->id)->where('status', CartStatus::Active)->lockForUpdate()->first()
                ?? Cart::create(['user_id' => $user->id, 'status' => CartStatus::Active, 'expires_at' => now()->addDays(config('commerce.guest_cart_days'))]);
            foreach ($guest->items as $guestItem) {
                $product = $guestItem->product;
                if (! $this->isPurchasable($product)) {
                    continue;
                }
                $item = $cart->items()->where('product_id', $product->id)->where('installation_required', $guestItem->installation_required)->lockForUpdate()->first();
                $quantity = min(($item?->quantity ?? 0) + $guestItem->quantity, $product->stock, config('commerce.max_item_quantity'));
                if ($quantity > 0) {
                    ($item ?? new CartItem(['cart_id' => $cart->id, 'product_id' => $product->id, 'installation_required' => $guestItem->installation_required]))->fill(['quantity' => $quantity, 'installation_notes' => $item?->installation_notes ?: $guestItem->installation_notes])->save();
                }
            }
            $guest->update(['status' => CartStatus::Converted, 'expires_at' => now()]);
        });
        $this->cookies->expire(config('commerce.guest_cart_cookie'));
    }

    public function payload(?Cart $cart): array
    {
        if (! $cart) {
            return ['items' => [], 'count' => 0, 'subtotal' => 0];
        }
        $cart->load(['items.product.category', 'items.product.brand', 'items.product.images']);
        $items = $cart->items->filter(fn (CartItem $item) => $this->isPurchasable($item->product))->map(function (CartItem $item) {
            $price = (int) $item->product->currentPrice();

            return [
                ...$item->only(['id', 'quantity', 'installation_required', 'installation_notes']),
                'unit_price' => $price,
                'line_total' => $price * $item->quantity,
                'product' => [
                    ...$item->product->only(['id', 'name', 'slug', 'sku', 'stock']),
                    'url' => route('products.show', [$item->product->category, $item->product]),
                    'image' => optional($item->product->images->first())->only(['url', 'alt_text']),
                    'brand' => $item->product->brand->only(['name']),
                ],
            ];
        })->values();

        return ['items' => $items, 'count' => $items->sum('quantity'), 'subtotal' => $items->sum('line_total')];
    }

    public function count(Request $request): int
    {
        $cart = $this->current($request);

        return $cart ? (int) $cart->items()
            ->whereHas('product', fn ($query) => $query->where('status', ProductStatus::Active)->where('is_available', true)->where('stock', '>', 0))
            ->sum('quantity') : 0;
    }

    private function resolveOrCreate(Request $request): Cart
    {
        if ($request->user()) {
            User::query()->lockForUpdate()->findOrFail($request->user()->id);

            return Cart::query()->where('user_id', $request->user()->id)->where('status', CartStatus::Active)->lockForUpdate()->first()
                ?? Cart::create(['user_id' => $request->user()->id, 'status' => CartStatus::Active, 'expires_at' => now()->addDays(30)]);
        }
        $token = $this->guestToken($request) ?: (string) Str::uuid();
        $cart = Cart::query()->where('guest_token', $token)->where('status', CartStatus::Active)->lockForUpdate()->first()
            ?? Cart::create(['guest_token' => $token, 'status' => CartStatus::Active, 'expires_at' => now()->addDays(config('commerce.guest_cart_days'))]);
        $this->cookies->queue(config('commerce.guest_cart_cookie'), $token, 60 * 24 * config('commerce.guest_cart_days'), '/', null, config('session.secure'), true, false, config('session.same_site'));

        return $cart;
    }

    private function ownedCart(Request $request, int $cartId): Cart
    {
        $cart = $this->current($request);
        if (! $cart || $cart->id !== $cartId) {
            throw (new ModelNotFoundException)->setModel(CartItem::class);
        }

        return $cart;
    }

    private function guestToken(Request $request): ?string
    {
        $token = $request->cookie(config('commerce.guest_cart_cookie'));

        return is_string($token) && Str::isUuid($token) ? $token : null;
    }

    private function ensurePurchasable(Product $product, int $quantity): void
    {
        if (! $this->isPurchasable($product)) {
            throw ValidationException::withMessages(['product_id' => 'Sản phẩm hiện không thể mua.']);
        }
        if ($quantity > $product->stock) {
            throw ValidationException::withMessages(['quantity' => 'Số lượng vượt quá tồn kho hiện tại.']);
        }
    }

    private function isPurchasable(Product $product): bool
    {
        return $product->status === ProductStatus::Active && $product->is_available && $product->stock > 0 && ! $product->trashed();
    }
}
