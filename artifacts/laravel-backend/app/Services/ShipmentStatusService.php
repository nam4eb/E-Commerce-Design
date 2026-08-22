<?php

namespace App\Services;

use App\Data\ShipmentProviderResult;
use App\Enums\OrderStatus;
use App\Enums\ShipmentStatus;
use App\Models\Shipment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShipmentStatusService
{
    private const TRANSITIONS = [
        'pending' => ['ready', 'failed'],
        'ready' => ['shipping', 'failed'],
        'shipping' => ['delivered', 'failed', 'returned'],
        'delivered' => [],
        'failed' => [],
        'returned' => [],
    ];

    public function __construct(private readonly OrderStatusService $orders) {}

    public function apply(Shipment $shipment, ShipmentProviderResult $result): Shipment
    {
        return DB::transaction(function () use ($shipment, $result) {
            $shipment = Shipment::query()->lockForUpdate()->findOrFail($shipment->id);
            if ($shipment->status !== $result->status && ! in_array($result->status->value, self::TRANSITIONS[$shipment->status->value], true)) {
                throw ValidationException::withMessages(['status' => 'Shipment status transition không hợp lệ.']);
            }
            $shipment->update([
                'status' => $result->status,
                'carrier' => $result->carrier ?? $shipment->carrier,
                'tracking_number' => $result->trackingNumber ?? $shipment->tracking_number,
                'payload' => [...($shipment->payload ?? []), ...$result->payload],
                'shipped_at' => $result->status === ShipmentStatus::Shipping ? now() : $shipment->shipped_at,
                'delivered_at' => $result->status === ShipmentStatus::Delivered ? now() : $shipment->delivered_at,
                'provider_synced_at' => now(),
                'last_error' => null,
            ]);
            $this->advanceOrder($shipment->order()->lockForUpdate()->firstOrFail(), $result->status);

            return $shipment->fresh();
        }, 3);
    }

    private function advanceOrder($order, ShipmentStatus $status): void
    {
        if ($status === ShipmentStatus::Ready && $order->status === OrderStatus::Pending) {
            $this->orders->transition($order, OrderStatus::Confirmed);
        }
        if ($status === ShipmentStatus::Shipping) {
            if ($order->status === OrderStatus::Confirmed) {
                $order = $this->orders->transition($order, OrderStatus::Processing);
            }
            if ($order->status === OrderStatus::Processing) {
                $this->orders->transition($order, OrderStatus::Shipping);
            }
        }
        if ($status === ShipmentStatus::Delivered && $order->status === OrderStatus::Shipping) {
            $this->orders->transition($order, OrderStatus::Delivered);
        }
    }
}
