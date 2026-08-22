<?php

namespace Database\Factories;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Address> */
class AddressFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'label' => 'Nhà',
            'recipient_name' => fake()->name(),
            'phone' => '09'.fake()->numerify('########'),
            'street' => fake()->streetAddress(),
            'ward' => 'Phường '.fake()->numberBetween(1, 20),
            'district' => 'Quận '.fake()->numberBetween(1, 12),
            'city' => 'Thành phố Hồ Chí Minh',
            'postal_code' => '700000',
            'is_default' => true,
        ];
    }
}
