<?php

namespace App\Data;

final readonly class PricingResult
{
    public function __construct(
        public array $lines,
        public int $subtotal,
        public int $promotionDiscount,
        public int $couponDiscount,
        public int $shippingTotal,
        public int $installationTotal,
        public int $grandTotal,
        public ?array $coupon,
        public bool $shippingAddressRequired,
        public string $currency = 'VND',
    ) {}

    public function toArray(): array
    {
        return get_object_vars($this);
    }
}
