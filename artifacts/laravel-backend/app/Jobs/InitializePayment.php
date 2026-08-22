<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\PaymentGatewayManager;
use App\Services\PaymentStatusService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class InitializePayment implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $uniqueFor = 300;

    public function __construct(public readonly int $paymentId) {}

    public function uniqueId(): string
    {
        return (string) $this->paymentId;
    }

    public function backoff(): array
    {
        return [10, 60, 300, 900];
    }

    public function handle(PaymentGatewayManager $gateways, PaymentStatusService $statuses): void
    {
        $payment = Payment::query()->with('order')->findOrFail($this->paymentId);
        $statuses->apply($payment, $gateways->driver($payment->provider)->initiate($payment));
    }

    public function failed(Throwable $exception): void
    {
        Payment::query()->whereKey($this->paymentId)->update(['last_error' => mb_substr($exception->getMessage(), 0, 2000)]);
        Log::critical('Payment initialization exhausted retries.', ['payment_id' => $this->paymentId, 'exception' => $exception::class]);
    }
}
