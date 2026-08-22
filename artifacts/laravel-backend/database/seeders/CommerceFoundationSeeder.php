<?php

namespace Database\Seeders;

use App\Enums\DiscountType;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Promotion;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class CommerceFoundationSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['key' => 'store.currency', 'value' => 'VND', 'type' => 'string', 'is_public' => true],
            ['key' => 'store.timezone', 'value' => 'Asia/Bangkok', 'type' => 'string', 'is_public' => true],
            ['key' => 'checkout.max_quantity_per_line', 'value' => '10', 'type' => 'integer', 'is_public' => false],
            ['key' => 'shipping.free_threshold', 'value' => '5000000', 'type' => 'integer', 'is_public' => true],
            ['key' => 'shipping.local_fee', 'value' => '50000', 'type' => 'integer', 'is_public' => true],
            ['key' => 'shipping.nationwide_fee', 'value' => '90000', 'type' => 'integer', 'is_public' => true],
            ['key' => 'installation.aircon.small', 'value' => '350000', 'type' => 'integer', 'is_public' => true],
            ['key' => 'installation.aircon.medium', 'value' => '450000', 'type' => 'integer', 'is_public' => true],
            ['key' => 'installation.aircon.large', 'value' => '550000', 'type' => 'integer', 'is_public' => true],
            ['key' => 'installation.water_heater', 'value' => '250000', 'type' => 'integer', 'is_public' => true],
        ] as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }

        $promotion = Promotion::updateOrCreate(['name' => 'Ưu đãi điều hòa mùa nóng'], [
            'type' => DiscountType::Percentage, 'value' => 3, 'maximum_discount' => 500000,
            'priority' => 10, 'is_stackable' => false, 'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonths(3), 'is_active' => true,
        ]);
        $categoryId = Category::where('slug', 'dieu-hoa')->value('id');
        if ($categoryId) {
            $promotion->categories()->sync([$categoryId]);
        }
        Coupon::updateOrCreate(['code' => 'DIENMAY100'], [
            'type' => DiscountType::Fixed, 'value' => 100000, 'maximum_discount' => 100000,
            'minimum_order' => 3000000, 'usage_limit' => 500, 'per_user_limit' => 1,
            'used_count' => 0, 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonths(3), 'is_active' => true,
        ]);
    }
}
