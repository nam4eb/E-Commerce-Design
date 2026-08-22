<?php

namespace App\Integrations\Payments;

use App\Contracts\PaymentGateway;
use App\Data\PaymentGatewayResult;
use App\Data\PaymentWebhookResult;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Validation\ValidationException;

class ManualPaymentGateway implements PaymentGateway
{
    public function initiate(Payment $payment): PaymentGatewayResult
    {
        return new PaymentGatewayResult(PaymentStatus::Pending, payload: ['mode' => 'manual', 'method' => $payment->method]);
    }

    public function parseWebhook(array $payload): PaymentWebhookResult
    {
        $status = PaymentStatus::tryFrom((string) ($payload['status'] ?? ''));
        if (! isset($payload['payment_id']) || ! $status || ! in_array($status, [PaymentStatus::Paid, PaymentStatus::Failed, PaymentStatus::Cancelled], true)) {
            throw ValidationException::withMessages(['payload' => 'Webhook payment payload không hợp lệ.']);
        }

        return new PaymentWebhookResult((int) $payload['payment_id'], $status, $payload['transaction_id'] ?? null, $payload);
    }
}
