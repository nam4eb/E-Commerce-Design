<?php

namespace App\Contracts;

use App\Data\PaymentGatewayResult;
use App\Data\PaymentWebhookResult;
use App\Models\Payment;

interface PaymentGateway
{
    public function initiate(Payment $payment): PaymentGatewayResult;

    public function parseWebhook(array $payload): PaymentWebhookResult;
}
