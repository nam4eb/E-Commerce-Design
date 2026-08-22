<?php

namespace Database\Factories;

use App\Enums\DiscountType;
use App\Models\Promotion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Promotion> */
class PromotionFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->words(3, true), 'type' => DiscountType::Percentage, 'value' => 10, 'maximum_discount' => 1000000, 'priority' => 10, 'is_stackable' => false, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(), 'is_active' => true];
    }
}
