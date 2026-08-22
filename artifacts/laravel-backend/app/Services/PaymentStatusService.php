<?php

namespace App\Services;

use App\Data\PaymentGatewayResult;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentStatusService
{
    private const TRANSITIONS = [
        'pending' => ['authorized', 'paid', 'failed', 'cancelled'],
        'authorized' => ['paid', 'failed', 'cancelled'],
        'paid' => ['refunded'],
        'failed' => [],
        'refunded' => [],
        'cancelled' => [],
    ];

    public function __construct(private readonly OrderStatusService $orders) {}

    public function apply(Payment $payment, PaymentGatewayResult $result): Payment
    {
        return DB::transaction(function () use ($payment, $result) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status === $result->status) {
                $payment->update(['payload' => [...($payment->payload ?? []), ...$result->payload], 'provider_synced_at' => now(), 'last_error' => null]);

                return $payment->fresh();
            }
            if (! in_array($result->status->value, self::TRANSITIONS[$payment->status->value], true)) {
                throw ValidationException::withMessages(['status' => 'Payment status transition không hợp lệ.']);
            }
            $payment->update([
                'status' => $result->status,
                'transaction_id' => $result->transactionId ?? $payment->transaction_id,
                'payload' => [...($payment->payload ?? []), ...$result->payload],
                'paid_at' => $result->status === PaymentStatus::Paid ? now() : $payment->paid_at,
                'provider_synced_at' => now(),
                'last_error' => null,
            ]);
            $order = $payment->order()->lockForUpdate()->firstOrFail();
            if ($result->status === PaymentStatus::Paid && $order->status === OrderStatus::Pending) {
                $this->orders->transition($order, OrderStatus::Confirmed);
            }

            return $payment->fresh();
        }, 3);
    }
}
