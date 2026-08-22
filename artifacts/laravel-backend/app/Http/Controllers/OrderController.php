<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\CheckoutService;
use App\Services\OrderStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = $request->user()->orders()->latest('placed_at')->paginate(10)->through(fn ($order) => $order->only([
            'number', 'status', 'grand_total', 'currency', 'placed_at',
        ]));

        return Inertia::render('Orders/Index', ['orders' => $orders]);
    }

    public function show(Request $request, Order $order, CheckoutService $checkout): Response
    {
        $checkout->authorizeAccess($request, $order);
        $order->load(['items.installation', 'payments', 'shipments']);

        return Inertia::render('Orders/Show', [
            'order' => [
                ...$order->only([
                    'number', 'status', 'currency', 'subtotal', 'discount_total', 'shipping_total',
                    'installation_total', 'grand_total', 'customer_name', 'customer_phone',
                    'customer_email', 'shipping_street', 'shipping_ward', 'shipping_district',
                    'shipping_city', 'shipping_postal_code', 'notes', 'placed_at',
                ]),
                'items' => $order->items->map(fn ($item) => [
                    ...$item->only(['sku', 'product_name', 'product_snapshot', 'unit_price', 'quantity', 'discount_total', 'line_total', 'installation_required', 'installation_fee']),
                    'installation' => $item->installation?->only(['status', 'fee', 'notes']),
                ]),
                'payment' => $order->payments->first()?->only(['provider', 'method', 'status', 'amount']),
                'shipment' => $order->shipments->first()?->only(['status', 'carrier', 'tracking_number']),
            ],
        ]);
    }

    public function cancel(Request $request, Order $order, CheckoutService $checkout, OrderStatusService $statuses): RedirectResponse
    {
        $checkout->authorizeAccess($request, $order);
        $statuses->transition($order, OrderStatus::Cancelled);

        return back()->with('status', 'order-cancelled');
    }
}
