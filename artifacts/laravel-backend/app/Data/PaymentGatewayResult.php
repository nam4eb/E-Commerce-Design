<?php

namespace App\Data;

use App\Enums\PaymentStatus;

final readonly class PaymentGatewayResult
{
    public function __construct(public PaymentStatus $status, public ?string $transactionId = null, public array $payload = []) {}
}
