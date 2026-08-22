<?php

namespace App\Http\Controllers;

use App\Data\PricingContext;
use App\Services\CartService;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CheckoutValidationController extends Controller
{
    public function __invoke(Request $request, CartService $carts, PricingService $pricing): JsonResponse
    {
        $data = $request->validate([
            'shipping_city' => ['required', 'string', 'max:100'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
        ]);
        $cart = $carts->current($request);
        if (! $cart || ! $cart->items()->exists()) {
            throw ValidationException::withMessages(['cart' => 'Giỏ hàng đang trống.']);
        }
        $quote = $pricing->quote($cart, new PricingContext($request->user(), $data['coupon_code'] ?? null, $data['shipping_city']));

        return response()->json(['quote' => $quote->toArray()]);
    }
}
