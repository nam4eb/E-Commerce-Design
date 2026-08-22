<?php

namespace App\Data;

use App\Enums\ShipmentStatus;

final readonly class ShipmentProviderResult
{
    public function __construct(public ShipmentStatus $status, public ?string $carrier = null, public ?string $trackingNumber = null, public array $payload = []) {}
}
