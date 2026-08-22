<?php

namespace App\Jobs;

use App\Models\Shipment;
use App\Services\ShipmentStatusService;
use App\Services\ShippingProviderManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class CreateShipment implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $uniqueFor = 300;

    public function __construct(public readonly int $shipmentId) {}

    public function uniqueId(): string
    {
        return (string) $this->shipmentId;
    }

    public function backoff(): array
    {
        return [10, 60, 300, 900];
    }

    public function handle(ShippingProviderManager $providers, ShipmentStatusService $statuses): void
    {
        $shipment = Shipment::query()->with('order')->findOrFail($this->shipmentId);
        $statuses->apply($shipment, $providers->driver($shipment->provider)->create($shipment));
    }

    public function failed(Throwable $exception): void
    {
        Shipment::query()->whereKey($this->shipmentId)->update(['last_error' => mb_substr($exception->getMessage(), 0, 2000)]);
        Log::critical('Shipment creation exhausted retries.', ['shipment_id' => $this->shipmentId, 'exception' => $exception::class]);
    }
}
