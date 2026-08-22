<?php

namespace App\Http\Controllers;

use App\Data\PricingContext;
use App\Http\Requests\StoreCheckoutRequest;
use App\Services\CartService;
use App\Services\CheckoutService;
use App\Services\PricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function create(Request $request, CartService $carts, PricingService $pricing): Response|RedirectResponse
    {
        $cart = $carts->current($request);
        if (! $cart || ! $cart->items()->exists()) {
            return redirect()->route('cart.show')->withErrors(['cart' => 'Giỏ hàng đang trống.']);
        }
        $addresses = $request->user()?->addresses()->orderByDesc('is_default')->orderByDesc('id')->get() ?? collect();
        $default = $addresses->first();
        $couponCode = $request->session()->get('cart.coupon_code');
        try {
            $quote = $pricing->quote($cart, new PricingContext($request->user(), $couponCode, $default?->city));
        } catch (ValidationException) {
            $request->session()->forget('cart.coupon_code');
            $couponCode = null;
            $quote = $pricing->quote($cart, new PricingContext($request->user(), shippingCity: $default?->city));
        }

        return Inertia::render('Checkout/Show', [
            'cart' => $carts->payload($cart),
            'quote' => $quote->toArray(),
            'couponCode' => $couponCode,
            'addresses' => $addresses,
            'idempotencyKey' => (string) Str::uuid(),
        ]);
    }

    public function store(StoreCheckoutRequest $request, CheckoutService $checkout): RedirectResponse
    {
        $order = $checkout->place($request, $request->validated());

        return redirect()->route('orders.show', $order)->with('status', 'order-placed');
    }
}
