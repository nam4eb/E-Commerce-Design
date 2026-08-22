<?php

namespace App\Services;

use App\Data\PricingContext;
use App\Enums\CartStatus;
use App\Enums\InstallationStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\ShipmentStatus;
use App\Events\OrderPlaced;
use App\Models\Address;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private readonly CartService $carts,
        private readonly PricingService $pricing,
    ) {}

    public function place(Request $request, array $data): Order
    {
        $existing = Order::query()->where('idempotency_key', $data['idempotency_key'])->first();
        if ($existing) {
            $this->authorizeAccess($request, $existing);

            return $existing;
        }

        $currentCart = $this->carts->current($request);
        if (! $currentCart) {
            throw ValidationException::withMessages(['cart' => 'Giỏ hàng đang trống.']);
        }

        $couponCode = $request->session()->get('cart.coupon_code');
        $order = DB::transaction(function () use ($request, $data, $currentCart, $couponCode) {
            $existing = Order::query()->where('idempotency_key', $data['idempotency_key'])->lockForUpdate()->first();
            if ($existing) {
                $this->authorizeAccess($request, $existing);

                return $existing;
            }

            $cart = Cart::query()->whereKey($currentCart->id)->where('status', CartStatus::Active)->lockForUpdate()->first();
            if (! $cart || ($request->user() ? $cart->user_id !== $request->user()->id : $cart->guest_token !== $currentCart->guest_token)) {
                throw ValidationException::withMessages(['cart' => 'Giỏ hàng không còn khả dụng.']);
            }

            $items = $cart->items()->orderBy('product_id')->lockForUpdate()->get();
            if ($items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => 'Giỏ hàng đang trống.']);
            }
            $products = Product::query()->with(['category', 'brand', 'images'])->whereIn('id', $items->pluck('product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($items as $item) {
                $product = $products->get($item->product_id);
                if (! $product || $product->status !== ProductStatus::Active || ! $product->is_available || $product->trashed() || $product->stock < $item->quantity) {
                    throw ValidationException::withMessages(['cart' => "Sản phẩm {$product?->name} không còn đủ tồn kho."]);
                }
                $item->setRelation('product', $product);
            }

            if ($couponCode) {
                Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper($couponCode)])->lockForUpdate()->first();
            }
            $address = $this->resolveAddress($request, $data);
            $shipping = $this->shippingSnapshot($request, $data, $address);
            $quote = $this->pricing->quote($cart, new PricingContext($request->user(), $couponCode, $shipping['shipping_city']));
            if (count($quote->lines) !== $items->count()) {
                throw ValidationException::withMessages(['cart' => 'Một hoặc nhiều sản phẩm không còn khả dụng.']);
            }

            $order = Order::create([
                'idempotency_key' => $data['idempotency_key'],
                'number' => $this->orderNumber(),
                'user_id' => $request->user()?->id,
                'address_id' => $address?->id,
                'coupon_id' => $quote->coupon['id'] ?? null,
                'status' => OrderStatus::Pending,
                'currency' => $quote->currency,
                'subtotal' => $quote->subtotal,
                'discount_total' => $quote->promotionDiscount + $quote->couponDiscount,
                'shipping_total' => $quote->shippingTotal,
                'installation_total' => $quote->installationTotal,
                'grand_total' => $quote->grandTotal,
                ...$shipping,
                'notes' => $data['notes'] ?? null,
                'placed_at' => now(),
            ]);

            $couponAllocations = $this->allocateDiscount($quote->lines, $quote->couponDiscount);
            foreach ($quote->lines as $line) {
                $item = $items->firstWhere('id', $line['cart_item_id']);
                $product = $products->get($line['product_id']);
                $discount = $line['promotion_discount'] + ($couponAllocations[$line['cart_item_id']] ?? 0);
                $orderItem = $order->items()->create([
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'product_name' => $product->name,
                    'product_snapshot' => [
                        'slug' => $product->slug,
                        'brand' => $product->brand->name,
                        'category' => $product->category->name,
                        'image' => $product->images->first()?->url,
                    ],
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'discount_total' => $discount,
                    'line_total' => $line['subtotal'] - $discount,
                    'installation_required' => $line['installation_required'],
                    'installation_fee' => $line['installation_fee'],
                    'installation_notes' => $item->installation_notes,
                ]);
                $product->decrement('stock', $line['quantity']);
                if ($line['installation_required']) {
                    $orderItem->installation()->create(['fee' => $line['installation_fee'], 'notes' => $item->installation_notes, 'status' => InstallationStatus::Pending]);
                }
            }

            $order->payments()->create([
                'provider' => 'manual',
                'method' => $data['payment_method'],
                'status' => PaymentStatus::Pending,
                'currency' => $quote->currency,
                'amount' => $quote->grandTotal,
            ]);
            $order->shipments()->create(['status' => ShipmentStatus::Pending]);
            if ($quote->coupon) {
                $coupon = Coupon::query()->lockForUpdate()->findOrFail($quote->coupon['id']);
                $coupon->increment('used_count');
                $coupon->redemptions()->create(['user_id' => $request->user()?->id, 'order_id' => $order->id, 'discount_amount' => $quote->couponDiscount]);
            }
            $cart->update(['status' => CartStatus::Converted, 'expires_at' => now()]);
            OrderPlaced::dispatch($order);

            return $order->load(['items.installation', 'payments', 'shipments']);
        }, 3);

        $request->session()->push('checkout.order_ids', $order->id);
        $request->session()->forget('cart.coupon_code');

        return $order;
    }

    public function authorizeAccess(Request $request, Order $order): void
    {
        $allowed = $request->user()
            ? $order->user_id === $request->user()->id
            : in_array($order->id, $request->session()->get('checkout.order_ids', []), true);
        if (! $allowed) {
            throw new AuthorizationException;
        }
    }

    private function resolveAddress(Request $request, array $data): ?Address
    {
        if (empty($data['address_id'])) {
            return null;
        }
        if (! $request->user()) {
            throw new AuthorizationException;
        }

        return Address::query()->where('user_id', $request->user()->id)->lockForUpdate()->findOrFail($data['address_id']);
    }

    private function shippingSnapshot(Request $request, array $data, ?Address $address): array
    {
        return [
            'customer_name' => $address?->recipient_name ?? $data['customer_name'],
            'customer_phone' => $address?->phone ?? $data['customer_phone'],
            'customer_email' => $data['customer_email'] ?? $request->user()?->email,
            'shipping_street' => $address?->street ?? $data['shipping_street'],
            'shipping_ward' => $address?->ward ?? ($data['shipping_ward'] ?? null),
            'shipping_district' => $address?->district ?? $data['shipping_district'],
            'shipping_city' => $address?->city ?? $data['shipping_city'],
            'shipping_postal_code' => $address?->postal_code ?? ($data['shipping_postal_code'] ?? null),
        ];
    }

    private function allocateDiscount(array $lines, int $discount): array
    {
        if ($discount === 0) {
            return [];
        }
        $base = array_sum(array_column($lines, 'line_total'));
        $remaining = $discount;
        $allocations = [];
        foreach ($lines as $index => $line) {
            $amount = $index === array_key_last($lines) ? $remaining : intdiv($discount * $line['line_total'] + intdiv($base, 2), $base);
            $amount = min($remaining, $amount);
            $allocations[$line['cart_item_id']] = $amount;
            $remaining -= $amount;
        }

        return $allocations;
    }

    private function orderNumber(): string
    {
        do {
            $number = 'DM-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));
        } while (Order::query()->where('number', $number)->exists());

        return $number;
    }
}
