<?php

namespace Tests\Feature;

use App\Enums\InstallationStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ShipmentStatus;
use App\Jobs\CreateShipment;
use App\Jobs\InitializePayment;
use App\Models\Order;
use App\Models\WebhookEvent;
use App\Notifications\OrderCustomerNotification;
use App\Services\InstallationSchedulingService;
use App\Services\MailCustomerNotifier;
use App\Services\PaymentGatewayManager;
use App\Services\PaymentStatusService;
use App\Services\ShipmentStatusService;
use App\Services\ShippingProviderManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Throwable;

class ProviderIntegrationPhaseNineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.payment_webhooks.secrets.manual' => 'phase-nine-secret']);
        config(['services.shipping_webhooks.secrets.manual' => 'shipping-secret']);
    }

    public function test_invalid_or_stale_webhook_is_rejected_without_audit_side_effect(): void
    {
        $payload = json_encode(['payment_id' => 1, 'status' => 'paid']);
        $this->callWebhook($payload, 'invalid', now()->timestamp)->assertUnauthorized();
        $this->callWebhook($payload, $this->signature($payload, now()->subMinutes(10)->timestamp), now()->subMinutes(10)->timestamp)->assertUnauthorized();
        $this->assertDatabaseCount('webhook_events', 0);
    }

    public function test_signed_webhook_is_idempotent_redacted_and_advances_payment(): void
    {
        $order = Order::factory()->create(['status' => OrderStatus::Pending]);
        $payment = $order->payments()->create(['provider' => 'manual', 'method' => 'bank_transfer', 'status' => PaymentStatus::Pending, 'currency' => 'VND', 'amount' => $order->grand_total]);
        $payload = json_encode(['payment_id' => $payment->id, 'status' => 'paid', 'transaction_id' => 'BANK-001', 'token' => 'must-not-persist']);
        $timestamp = now()->timestamp;

        $this->callWebhook($payload, $this->signature($payload, $timestamp), $timestamp, 'evt-paid-1')->assertOk()->assertJson(['received' => true]);
        $this->callWebhook($payload, $this->signature($payload, $timestamp), $timestamp, 'evt-paid-1')->assertOk()->assertJson(['duplicate' => true]);
        $changed = json_encode(['payment_id' => $payment->id, 'status' => 'failed']);
        $this->callWebhook($changed, $this->signature($changed, $timestamp), $timestamp, 'evt-paid-1')->assertConflict();

        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
        $this->assertSame('BANK-001', $payment->fresh()->transaction_id);
        $this->assertSame('[REDACTED]', WebhookEvent::sole()->payload['token']);
        $this->assertDatabaseCount('webhook_events', 1);
    }

    public function test_manual_provider_jobs_sync_metadata_without_external_calls(): void
    {
        $order = Order::factory()->create();
        $payment = $order->payments()->create(['provider' => 'manual', 'method' => 'cod', 'status' => PaymentStatus::Pending, 'currency' => 'VND', 'amount' => $order->grand_total]);
        $shipment = $order->shipments()->create(['provider' => 'manual', 'status' => ShipmentStatus::Pending]);

        (new InitializePayment($payment->id))->handle(app(PaymentGatewayManager::class), app(PaymentStatusService::class));
        (new CreateShipment($shipment->id))->handle(app(ShippingProviderManager::class), app(ShipmentStatusService::class));

        $this->assertNotNull($payment->fresh()->provider_synced_at);
        $this->assertSame('manual', $payment->fresh()->payload['mode']);
        $this->assertNotNull($shipment->fresh()->provider_synced_at);
        $this->assertSame('Điện Máy 365', $shipment->fresh()->carrier);
    }

    public function test_shipping_webhook_maps_tracking_and_advances_order_status(): void
    {
        $order = Order::factory()->create(['status' => OrderStatus::Pending]);
        $shipment = $order->shipments()->create(['provider' => 'manual', 'status' => ShipmentStatus::Pending]);

        foreach (['ready', 'shipping', 'delivered'] as $index => $status) {
            $payload = json_encode(['shipment_id' => $shipment->id, 'status' => $status, 'carrier' => 'Internal', 'tracking_number' => 'TRACK-001', 'token' => 'redact-me']);
            $timestamp = now()->timestamp;
            $this->callShippingWebhook($payload, hash_hmac('sha256', $timestamp.'.'.$payload, 'shipping-secret'), $timestamp, 'ship-'.$index)->assertOk();
        }

        $this->assertSame(ShipmentStatus::Delivered, $shipment->fresh()->status);
        $this->assertSame(OrderStatus::Delivered, $order->fresh()->status);
        $this->assertSame('TRACK-001', $shipment->fresh()->tracking_number);
        $this->assertSame('[REDACTED]', WebhookEvent::query()->where('provider', 'shipping:manual')->firstOrFail()->payload['token']);
    }

    public function test_provider_failure_is_recorded_without_deleting_order(): void
    {
        $order = Order::factory()->create();
        $payment = $order->payments()->create(['provider' => 'missing', 'method' => 'cod', 'status' => PaymentStatus::Pending, 'currency' => 'VND', 'amount' => $order->grand_total]);
        $job = new InitializePayment($payment->id);

        try {
            $job->handle(app(PaymentGatewayManager::class), app(PaymentStatusService::class));
            $this->fail('Expected provider failure.');
        } catch (Throwable $exception) {
            $job->failed($exception);
        }

        $this->assertDatabaseHas('orders', ['id' => $order->id]);
        $this->assertStringContainsString('chưa được cấu hình', $payment->fresh()->last_error);
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
    }

    public function test_installation_schedule_and_customer_notification_are_provider_agnostic(): void
    {
        Notification::fake();
        $order = Order::factory()->create(['customer_email' => 'buyer@example.com']);
        $item = $order->items()->create(['sku' => 'SKU-1', 'product_name' => 'Điều hòa', 'unit_price' => 1000000, 'quantity' => 1, 'line_total' => 1000000, 'installation_required' => true, 'installation_fee' => 350000]);
        $installation = $item->installation()->create(['fee' => 350000, 'status' => InstallationStatus::Pending]);

        $scheduled = app(InstallationSchedulingService::class)->schedule($installation, now()->addDay());
        $this->assertSame(InstallationStatus::Scheduled, $scheduled->status);
        app(MailCustomerNotifier::class)->orderPlaced($order);
        Notification::assertSentOnDemand(OrderCustomerNotification::class);
    }

    private function callWebhook(string $payload, string $signature, int $timestamp, string $eventId = 'evt-test')
    {
        return $this->call('POST', '/api/v1/webhooks/payments/manual', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WEBHOOK_ID' => $eventId,
            'HTTP_X_WEBHOOK_TIMESTAMP' => (string) $timestamp,
            'HTTP_X_WEBHOOK_SIGNATURE' => $signature,
        ], $payload);
    }

    private function signature(string $payload, int $timestamp): string
    {
        return hash_hmac('sha256', $timestamp.'.'.$payload, 'phase-nine-secret');
    }

    private function callShippingWebhook(string $payload, string $signature, int $timestamp, string $eventId)
    {
        return $this->call('POST', '/api/v1/webhooks/shipments/manual', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WEBHOOK_ID' => $eventId, 'HTTP_X_WEBHOOK_TIMESTAMP' => (string) $timestamp,
            'HTTP_X_WEBHOOK_SIGNATURE' => $signature,
        ], $payload);
    }
}
