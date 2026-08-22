<?php

namespace Database\Factories;

use App\Enums\DiscountType;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Coupon> */
class CouponFactory extends Factory
{
    public function definition(): array
    {
        return ['code' => strtoupper(fake()->unique()->bothify('SALE-####')), 'type' => DiscountType::Fixed, 'value' => 100000, 'minimum_order' => 1000000, 'usage_limit' => 100, 'per_user_limit' => 1, 'used_count' => 0, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(), 'is_active' => true];
    }
}
