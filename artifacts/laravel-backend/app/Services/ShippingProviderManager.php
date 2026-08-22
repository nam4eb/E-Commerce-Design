<?php

namespace App\Services;

use App\Contracts\ShippingProvider;
use App\Integrations\Shipping\ManualShippingProvider;
use InvalidArgumentException;

class ShippingProviderManager
{
    public function __construct(private readonly ManualShippingProvider $manual) {}

    public function driver(string $provider): ShippingProvider
    {
        return match ($provider) {
            'manual' => $this->manual,
            default => throw new InvalidArgumentException("Shipping provider [{$provider}] chưa được cấu hình."),
        };
    }
}
