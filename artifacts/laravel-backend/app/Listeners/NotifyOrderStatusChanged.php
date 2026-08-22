<?php

namespace App\Listeners;

use App\Contracts\CustomerNotifier;
use App\Events\OrderStatusChanged;

class NotifyOrderStatusChanged
{
    public function __construct(private readonly CustomerNotifier $notifier) {}

    public function handle(OrderStatusChanged $event): void
    {
        $this->notifier->orderStatusChanged($event->order);
    }
}
