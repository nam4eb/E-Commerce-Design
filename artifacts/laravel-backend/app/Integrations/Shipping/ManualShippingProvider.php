<?php

namespace App\Integrations\Shipping;

use App\Contracts\ShippingProvider;
use App\Data\ShipmentProviderResult;
use App\Enums\ShipmentStatus;
use App\Models\Shipment;
use InvalidArgumentException;

class ManualShippingProvider implements ShippingProvider
{
    public function create(Shipment $shipment): ShipmentProviderResult
    {
        return new ShipmentProviderResult(ShipmentStatus::Pending, 'Điện Máy 365', payload: ['mode' => 'manual']);
    }

    public function mapStatus(string $providerStatus): string
    {
        return match (strtolower($providerStatus)) {
            'ready', 'created' => ShipmentStatus::Ready->value,
            'shipping', 'in_transit' => ShipmentStatus::Shipping->value,
            'delivered' => ShipmentStatus::Delivered->value,
            'returned' => ShipmentStatus::Returned->value,
            'failed' => ShipmentStatus::Failed->value,
            default => throw new InvalidArgumentException('Unknown shipping provider status.'),
        };
    }
}
