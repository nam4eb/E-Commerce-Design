<?php

namespace App\Http\Controllers;

use App\Data\PaymentGatewayResult;
use App\Models\Payment;
use App\Models\WebhookEvent;
use App\Services\PaymentGatewayManager;
use App\Services\PaymentStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class PaymentWebhookController extends Controller
{
    public function __invoke(Request $request, string $provider, PaymentGatewayManager $gateways, PaymentStatusService $statuses): JsonResponse
    {
        $raw = $request->getContent();
        $timestamp = (string) $request->header('X-Webhook-Timestamp');
        $externalId = (string) $request->header('X-Webhook-Id');
        $signature = (string) $request->header('X-Webhook-Signature');
        $secret = config("services.payment_webhooks.secrets.{$provider}");
        if (! is_string($secret) || $secret === '') {
            throw new HttpException(503, 'Webhook provider chưa được cấu hình.');
        }
        if (! ctype_digit($timestamp) || abs(now()->timestamp - (int) $timestamp) > config('services.payment_webhooks.tolerance_seconds')) {
            throw new HttpException(401, 'Webhook timestamp không hợp lệ.');
        }
        if ($externalId === '' || strlen($externalId) > 191 || ! hash_equals(hash_hmac('sha256', $timestamp.'.'.$raw, $secret), $signature)) {
            throw new HttpException(401, 'Webhook signature không hợp lệ.');
        }
        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            throw ValidationException::withMessages(['payload' => 'Webhook JSON không hợp lệ.']);
        }

        $event = WebhookEvent::query()->firstOrCreate(
            ['provider' => $provider, 'external_id' => $externalId],
            ['type' => $payload['type'] ?? null, 'status' => 'received', 'payload_hash' => hash('sha256', $raw), 'payload' => $this->redact($payload)],
        );
        if (! $event->wasRecentlyCreated) {
            if (! hash_equals($event->payload_hash, hash('sha256', $raw))) {
                throw new HttpException(409, 'Webhook event ID đã được dùng với payload khác.');
            }

            return response()->json(['received' => true, 'duplicate' => true]);
        }

        try {
            $result = $gateways->driver($provider)->parseWebhook($payload);
            $payment = Payment::query()->findOrFail($result->paymentId);
            if ($payment->provider !== $provider) {
                throw ValidationException::withMessages(['provider' => 'Webhook provider không khớp payment.']);
            }
            $statuses->apply($payment, new PaymentGatewayResult($result->status, $result->transactionId, $this->redact($result->payload)));
            $event->update(['status' => 'processed', 'processed_at' => now()]);
        } catch (Throwable $exception) {
            $event->update(['status' => 'failed', 'error' => mb_substr($exception->getMessage(), 0, 2000)]);
            throw $exception;
        }

        return response()->json(['received' => true]);
    }

    private function redact(array $payload): array
    {
        $sensitive = ['card', 'card_number', 'cvv', 'token', 'secret', 'authorization', 'password'];
        foreach ($payload as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitive, true)) {
                $payload[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $payload[$key] = $this->redact($value);
            }
        }

        return $payload;
    }
}
