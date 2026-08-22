<?php

namespace App\Contracts;

use App\Models\Order;

interface CustomerNotifier
{
    public function orderPlaced(Order $order): void;

    public function orderStatusChanged(Order $order): void;
}
