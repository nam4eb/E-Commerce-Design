<?php

namespace App\Data;

use App\Models\User;

final readonly class PricingContext
{
    public function __construct(
        public ?User $user = null,
        public ?string $couponCode = null,
        public ?string $shippingCity = null,
    ) {}
}
