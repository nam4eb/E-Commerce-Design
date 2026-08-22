<?php

namespace App\Http\Controllers;

use App\Data\ShipmentProviderResult;
use App\Enums\ShipmentStatus;
use App\Models\Shipment;
use App\Models\WebhookEvent;
use App\Services\ShipmentStatusService;
use App\Services\ShippingProviderManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class ShippingWebhookController extends Controller
{
    public function __invoke(Request $request, string $provider, ShippingProviderManager $providers, ShipmentStatusService $statuses): JsonResponse
    {
        $raw = $request->getContent();
        $timestamp = (string) $request->header('X-Webhook-Timestamp');
        $externalId = (string) $request->header('X-Webhook-Id');
        $secret = config("services.shipping_webhooks.secrets.{$provider}");
        if (! is_string($secret) || $secret === '') {
            throw new HttpException(503, 'Shipping webhook provider chưa được cấu hình.');
        }
        if (! ctype_digit($timestamp) || abs(now()->timestamp - (int) $timestamp) > config('services.shipping_webhooks.tolerance_seconds')) {
            throw new HttpException(401, 'Webhook timestamp không hợp lệ.');
        }
        $signature = (string) $request->header('X-Webhook-Signature');
        if ($externalId === '' || strlen($externalId) > 191 || ! hash_equals(hash_hmac('sha256', $timestamp.'.'.$raw, $secret), $signature)) {
            throw new HttpException(401, 'Webhook signature không hợp lệ.');
        }
        $payload = json_decode($raw, true);
        if (! is_array($payload) || ! isset($payload['shipment_id'], $payload['status'])) {
            throw ValidationException::withMessages(['payload' => 'Shipping webhook payload không hợp lệ.']);
        }
        $eventProvider = 'shipping:'.$provider;
        $event = WebhookEvent::query()->firstOrCreate(
            ['provider' => $eventProvider, 'external_id' => $externalId],
            ['type' => $payload['type'] ?? 'shipment.status', 'status' => 'received', 'payload_hash' => hash('sha256', $raw), 'payload' => $this->redact($payload)],
        );
        if (! $event->wasRecentlyCreated) {
            if (! hash_equals($event->payload_hash, hash('sha256', $raw))) {
                throw new HttpException(409, 'Webhook event ID đã được dùng với payload khác.');
            }

            return response()->json(['received' => true, 'duplicate' => true]);
        }
        try {
            $shipment = Shipment::query()->findOrFail((int) $payload['shipment_id']);
            if ($shipment->provider !== $provider) {
                throw ValidationException::withMessages(['provider' => 'Webhook provider không khớp shipment.']);
            }
            $status = ShipmentStatus::from($providers->driver($provider)->mapStatus((string) $payload['status']));
            $statuses->apply($shipment, new ShipmentProviderResult($status, $payload['carrier'] ?? null, $payload['tracking_number'] ?? null, $this->redact($payload)));
            $event->update(['status' => 'processed', 'processed_at' => now()]);
        } catch (Throwable $exception) {
            $event->update(['status' => 'failed', 'error' => mb_substr($exception->getMessage(), 0, 2000)]);
            throw $exception;
        }

        return response()->json(['received' => true]);
    }

    private function redact(array $payload): array
    {
        $sensitive = ['token', 'secret', 'authorization', 'password'];
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
