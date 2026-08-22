<?php

namespace App\Data;

use App\Enums\PaymentStatus;

final readonly class PaymentWebhookResult
{
    public function __construct(public int $paymentId, public PaymentStatus $status, public ?string $transactionId = null, public array $payload = []) {}
}
