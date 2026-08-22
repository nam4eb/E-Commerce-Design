<?php

return [
    'guest_cart_cookie' => env('GUEST_CART_COOKIE', 'dienmay365_guest_cart'),
    'guest_cart_days' => (int) env('GUEST_CART_DAYS', 30),
    'max_item_quantity' => (int) env('CART_MAX_ITEM_QUANTITY', 99),
    'pricing' => [
        'shipping.free_threshold' => 5000000,
        'shipping.local_fee' => 50000,
        'shipping.nationwide_fee' => 90000,
        'installation.aircon.small' => 350000,
        'installation.aircon.medium' => 450000,
        'installation.aircon.large' => 550000,
        'installation.water_heater' => 250000,
    ],
];
