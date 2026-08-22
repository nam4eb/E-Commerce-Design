<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Events\OrderStatusChanged;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderStatusService
{
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled', 'failed'],
        'confirmed' => ['processing', 'cancelled', 'failed'],
        'processing' => ['shipping', 'cancelled', 'failed'],
        'shipping' => ['delivered', 'failed'],
        'delivered' => [],
        'cancelled' => [],
        'failed' => [],
    ];

    public function transition(Order $order, OrderStatus $target): Order
    {
        return DB::transaction(function () use ($order, $target) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            if (! in_array($target->value, self::TRANSITIONS[$order->status->value], true)) {
                throw ValidationException::withMessages(['status' => "Không thể chuyển đơn từ {$order->status->value} sang {$target->value}."]);
            }
            if (in_array($target, [OrderStatus::Cancelled, OrderStatus::Failed], true)) {
                $this->releaseCommerce($order);
            }
            $order->update(['status' => $target]);
            OrderStatusChanged::dispatch($order);

            return $order->fresh();
        }, 3);
    }

    private function releaseCommerce(Order $order): void
    {
        if (! $order->stock_released_at) {
            $items = $order->items()->orderBy('product_id')->lockForUpdate()->get();
            $products = Product::query()->whereIn('id', $items->pluck('product_id')->filter())->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($items as $item) {
                $products->get($item->product_id)?->increment('stock', $item->quantity);
            }
            $order->stock_released_at = now();
        }
        if ($order->coupon_id && ! $order->coupon_released_at) {
            $coupon = Coupon::query()->lockForUpdate()->find($order->coupon_id);
            $deleted = $order->couponRedemptions()->delete();
            if ($coupon && $deleted > 0 && $coupon->used_count > 0) {
                $coupon->decrement('used_count');
            }
            $order->coupon_released_at = now();
        }
        $order->save();
    }
}
