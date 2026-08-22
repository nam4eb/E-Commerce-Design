<?php

namespace App\Http\Controllers;

use App\Data\PricingContext;
use App\Http\Requests\CartItemRequest;
use App\Models\CartItem;
use App\Services\CartService;
use App\Services\PricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function show(Request $request, CartService $carts, PricingService $pricing): Response
    {
        $cart = $carts->current($request);
        $couponCode = $request->session()->get('cart.coupon_code');
        $couponError = null;
        try {
            $quote = $cart ? $pricing->quote($cart, new PricingContext($request->user(), $couponCode))->toArray() : null;
        } catch (ValidationException $exception) {
            $request->session()->forget('cart.coupon_code');
            $couponCode = null;
            $couponError = $exception->errors()['coupon_code'][0] ?? 'Mã giảm giá không còn hợp lệ.';
            $quote = $cart ? $pricing->quote($cart)->toArray() : null;
        }

        return Inertia::render('Cart/Show', [
            'cart' => $carts->payload($cart),
            'quote' => $quote,
            'couponCode' => $couponCode,
            'couponError' => $couponError,
            'status' => session('status'),
        ]);
    }

    public function store(CartItemRequest $request, CartService $carts): RedirectResponse
    {
        $carts->add($request, $request->validated());

        return back()->with('status', 'cart-item-added');
    }

    public function update(Request $request, CartItem $cartItem, CartService $carts): RedirectResponse
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:'.config('commerce.max_item_quantity')]]);
        $carts->update($request, $cartItem, $data['quantity']);

        return back()->with('status', 'cart-item-updated');
    }

    public function destroy(Request $request, CartItem $cartItem, CartService $carts): RedirectResponse
    {
        $carts->remove($request, $cartItem);

        return back()->with('status', 'cart-item-removed');
    }

    public function applyCoupon(Request $request, CartService $carts, PricingService $pricing): RedirectResponse
    {
        $data = $request->validate(['coupon_code' => ['required', 'string', 'max:50']]);
        $cart = $carts->current($request);
        if (! $cart || ! $cart->items()->exists()) {
            return back()->withErrors(['coupon_code' => 'Giỏ hàng đang trống.']);
        }
        $pricing->quote($cart, new PricingContext($request->user(), $data['coupon_code']));
        $request->session()->put('cart.coupon_code', strtoupper(trim($data['coupon_code'])));

        return back()->with('status', 'coupon-applied');
    }

    public function removeCoupon(Request $request): RedirectResponse
    {
        $request->session()->forget('cart.coupon_code');

        return back()->with('status', 'coupon-removed');
    }
}
