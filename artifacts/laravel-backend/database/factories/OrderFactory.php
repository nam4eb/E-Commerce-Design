<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Address;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Order> */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        return ['idempotency_key' => (string) Str::uuid(), 'number' => 'DM'.now()->format('Ymd').fake()->unique()->numerify('######'), 'user_id' => null, 'address_id' => null, 'coupon_id' => null, 'status' => OrderStatus::Pending, 'currency' => 'VND', 'subtotal' => 1000000, 'discount_total' => 0, 'shipping_total' => 0, 'installation_total' => 0, 'grand_total' => 1000000, 'customer_name' => fake()->name(), 'customer_phone' => '09'.fake()->numerify('########'), 'customer_email' => fake()->safeEmail(), 'shipping_street' => fake()->streetAddress(), 'shipping_ward' => 'Phường 1', 'shipping_district' => 'Quận 1', 'shipping_city' => 'Thành phố Hồ Chí Minh', 'placed_at' => now()];
    }

    public function forAddress(Address $address): static
    {
        return $this->state(fn () => ['user_id' => $address->user_id, 'address_id' => $address->id]);
    }
}
