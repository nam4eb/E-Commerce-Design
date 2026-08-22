<?php

namespace App\Listeners;

use App\Contracts\CustomerNotifier;
use App\Events\OrderPlaced;
use App\Jobs\CreateShipment;
use App\Jobs\InitializePayment;

class HandleOrderPlaced
{
    public function __construct(private readonly CustomerNotifier $notifier) {}

    public function handle(OrderPlaced $event): void
    {
        $event->order->loadMissing(['payments', 'shipments']);
        foreach ($event->order->payments as $payment) {
            InitializePayment::dispatch($payment->id)->afterCommit();
        }
        foreach ($event->order->shipments as $shipment) {
            CreateShipment::dispatch($shipment->id)->afterCommit();
        }
        $this->notifier->orderPlaced($event->order);
    }
}
