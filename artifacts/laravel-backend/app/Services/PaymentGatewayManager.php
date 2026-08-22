<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Integrations\Payments\ManualPaymentGateway;
use InvalidArgumentException;

class PaymentGatewayManager
{
    public function __construct(private readonly ManualPaymentGateway $manual) {}

    public function driver(string $provider): PaymentGateway
    {
        return match ($provider) {
            'manual' => $this->manual,
            default => throw new InvalidArgumentException("Payment provider [{$provider}] chưa được cấu hình."),
        };
    }
}
