<?php

namespace Database\Factories;

use App\Enums\CartStatus;
use App\Models\Cart;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Cart> */
class CartFactory extends Factory
{
    public function definition(): array
    {
        return ['user_id' => User::factory(), 'guest_token' => null, 'status' => CartStatus::Active, 'expires_at' => now()->addDays(30)];
    }

    public function guest(): static
    {
        return $this->state(fn () => ['user_id' => null, 'guest_token' => fake()->uuid()]);
    }
}
