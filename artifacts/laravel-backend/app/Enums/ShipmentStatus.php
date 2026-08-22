<?php

namespace App\Enums;

enum ShipmentStatus: string
{
    case Pending = 'pending';
    case Ready = 'ready';
    case Shipping = 'shipping';
    case Delivered = 'delivered';
    case Failed = 'failed';
    case Returned = 'returned';
}
