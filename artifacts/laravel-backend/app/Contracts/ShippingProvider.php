<?php

namespace App\Contracts;

use App\Data\ShipmentProviderResult;
use App\Models\Shipment;

interface ShippingProvider
{
    public function create(Shipment $shipment): ShipmentProviderResult;

    public function mapStatus(string $providerStatus): string;
}
