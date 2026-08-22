<?php

namespace App\Services;

use App\Contracts\CustomerNotifier;
use App\Models\Order;
use App\Notifications\OrderCustomerNotification;
use Illuminate\Support\Facades\Notification;

class MailCustomerNotifier implements CustomerNotifier
{
    public function orderPlaced(Order $order): void
    {
        $this->send($order, 'placed');
    }

    public function orderStatusChanged(Order $order): void
    {
        $this->send($order, 'status_changed');
    }

    private function send(Order $order, string $event): void
    {
        if ($order->customer_email) {
            Notification::route('mail', $order->customer_email)->notify(new OrderCustomerNotification($order, $event));
        }
    }
}
