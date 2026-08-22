<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categoryRows = [['Điều hòa', 'dieu-hoa'], ['Tủ lạnh', 'tu-lanh'], ['Máy giặt', 'may-giat'], ['Tivi', 'tivi'], ['Đồ gia dụng', 'do-gia-dung'], ['Máy nước nóng', 'may-nuoc-nong'], ['Máy hút bụi', 'may-hut-bui'], ['Quạt', 'quat']];
        $categories = collect($categoryRows)->mapWithKeys(function ($row, $index) {
            [$name,$slug] = $row;

            return [$slug => Category::updateOrCreate(['slug' => $slug], ['name' => $name, 'description' => "$name chính hãng, tiết kiệm điện, bảo hành rõ ràng.", 'status' => 'active', 'sort_order' => $index + 1, 'seo_title' => "$name chính hãng, giá tốt | Điện Máy 365", 'seo_description' => "Mua $name chính hãng, giao nhanh và hỗ trợ lắp đặt tận nơi."])];
        });
        $brands = collect(['Daikin', 'Panasonic', 'LG', 'Samsung', 'Electrolux', 'Toshiba', 'Aqua', 'Sharp', 'Casper', 'Sunhouse'])->mapWithKeys(function ($name) {
            $slug = Str::slug($name);

            return [$slug => Brand::updateOrCreate(['slug' => $slug], ['name' => $name, 'description' => "$name cung cấp thiết bị điện máy và gia dụng chính hãng.", 'status' => 'active', 'seo_title' => "$name chính hãng | Điện Máy 365", 'seo_description' => "Khám phá sản phẩm $name chính hãng, giá tốt và bảo hành rõ ràng."])];
        });
        $catalog = [
            'dieu-hoa' => [
                ['Daikin Inverter 1.5 HP ATKF35XVMV', 'daikin', 'DAI-ATKF35XVMV', 12990000, 16650000, 12000, '15–20 m²', 'ac-02', 'daikin-inverter-1-5-hp-atkf35xvmv'], ['Daikin Inverter 1 HP ATKF25XVMV', 'daikin', 'DAI-ATKF25XVMV', 10490000, 12790000, 9000, 'Dưới 15 m²', 'ac-01', 'daikin-inverter-1-hp-atkf25xvmv'], ['Panasonic Inverter 1.5 HP XU12ZKH-8', 'panasonic', 'PAN-XU12ZKH8', 14890000, 16990000, 12000, '15–20 m²', 'ac-03', 'panasonic-inverter-1-5-hp-xu12zkh-8'], ['LG Dual Inverter 1 HP V10WIN1', 'lg', 'LG-V10WIN1', 9490000, 11290000, 9000, 'Dưới 15 m²'], ['Casper Inverter 1.5 HP GC-12IS35', 'casper', 'CAS-GC12IS35', 8490000, 9990000, 12000, '15–20 m²'], ['Aqua Inverter 1 HP AQA-RV10QA3', 'aqua', 'AQUA-RV10QA3', 7890000, 9290000, 9000, 'Dưới 15 m²'],
            ],
            'tu-lanh' => [['LG Inverter 374 lít GN-D372BL', 'lg', 'LG-GND372BL', 11990000, 13990000], ['Samsung Inverter 382 lít RT38CG6584B1SV', 'samsung', 'SS-RT38CG6584', 13990000, 15990000], ['Aqua Inverter 344 lít AQR-IG386DN', 'aqua', 'AQUA-IG386DN', 10990000, 12990000], ['Toshiba Inverter 409 lít GR-RT535WE', 'toshiba', 'TS-GRRT535WE', 14990000, 16990000], ['Sharp Inverter 362 lít SJ-FX420V', 'sharp', 'SH-SJFX420V', 12990000, 14990000]],
            'may-giat' => [['Electrolux Inverter 10 kg EWF1024P5WB', 'electrolux', 'EL-EWF1024P5WB', 10990000, 12990000], ['LG AI DD Inverter 10 kg FV1410S4B', 'lg', 'LG-FV1410S4B', 11990000, 13990000], ['Samsung AI Ecobubble 9 kg WW90T634DLN', 'samsung', 'SS-WW90T634', 10490000, 12490000], ['Toshiba GreatWaves 9.5 kg TW-BK105G4V', 'toshiba', 'TS-TWBK105G4V', 8990000, 10490000], ['Aqua Inverter 10 kg AQD-D1002G', 'aqua', 'AQUA-D1002G', 8490000, 9990000]],
            'tivi' => [['Samsung Crystal UHD 55 inch UA55DU8000', 'samsung', 'SS-UA55DU8000', 12990000, 15990000], ['LG 4K AI 55 inch 55UT8050', 'lg', 'LG-55UT8050', 11990000, 14990000], ['Sharp 4K 50 inch 4T-C50FJ1X', 'sharp', 'SH-4TC50FJ1X', 9990000, 11990000], ['Toshiba 4K 55 inch 55C350NP', 'toshiba', 'TS-55C350NP', 10990000, 12990000], ['Samsung QLED 65 inch QA65Q60D', 'samsung', 'SS-QA65Q60D', 19990000, 23990000]],
            'do-gia-dung' => [['Nồi cơm điện tử Toshiba 1.8 lít RC-18NTFV', 'toshiba', 'TS-RC18NTFV', 2390000, 2990000], ['Nồi chiên không dầu Sunhouse 6 lít SHD4026', 'sunhouse', 'SUN-SHD4026', 1890000, 2390000], ['Lò vi sóng Sharp 20 lít R-G222VN', 'sharp', 'SH-RG222VN', 1690000, 2090000], ['Bếp từ đôi Electrolux EHI7280BB', 'electrolux', 'EL-EHI7280BB', 12990000, 14990000], ['Máy lọc nước nóng lạnh Sunhouse SHA76215CK', 'sunhouse', 'SUN-SHA76215', 7490000, 8990000]],
            'may-nuoc-nong' => [['Panasonic DH-4NP1VW 4500W', 'panasonic', 'PAN-DH4NP1VW', 3490000, 3990000], ['Electrolux EWE451LB-DPX2 4500W', 'electrolux', 'EL-EWE451LB', 3290000, 3790000], ['Panasonic DH-3RL2VH 3500W', 'panasonic', 'PAN-DH3RL2VH', 2890000, 3390000]],
            'may-hut-bui' => [['Electrolux 1800W EC41-6CR', 'electrolux', 'EL-EC416CR', 2690000, 3190000], ['Samsung Jet 60 Turbo VS15A6031R1', 'samsung', 'SS-VS15A6031', 6990000, 7990000], ['LG CordZero A9N-LITE', 'lg', 'LG-A9NLITE', 8490000, 9990000]],
            'quat' => [['Quạt đứng Toshiba F-LSA20VN 60W', 'toshiba', 'TS-FLSA20VN', 1590000, 1890000], ['Quạt điều hòa Sunhouse SHD7727', 'sunhouse', 'SUN-SHD7727', 3490000, 4190000], ['Quạt lửng Sharp PJ-L40RV', 'sharp', 'SH-PJL40RV', 1290000, 1590000]],
        ];
        $images = ['https://images.pexels.com/photos/5824518/pexels-photo-5824518.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/3637739/pexels-photo-3637739.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/4108806/pexels-photo-4108806.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/5825366/pexels-photo-5825366.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/6585756/pexels-photo-6585756.jpeg?auto=compress&cs=tinysrgb&w=1200', 'https://images.pexels.com/photos/4846097/pexels-photo-4846097.jpeg?auto=compress&cs=tinysrgb&w=1200'];
        $position = 0;
        foreach ($catalog as $categorySlug => $items) {
            foreach ($items as $item) {
                [$model,$brandSlug,$sku,$price,$original] = $item;
                $name = $categories[$categorySlug]->name.' '.$model;
                $product = Product::updateOrCreate(['sku' => $sku], [
                    'category_id' => $categories[$categorySlug]->id, 'brand_id' => $brands[$brandSlug]->id, 'name' => $name, 'slug' => $item[8] ?? Str::slug($name), 'legacy_id' => $item[7] ?? null, 'mpn' => explode('-', $sku, 2)[1] ?? $sku,
                    'short_description' => "$name chính hãng, tiết kiệm điện và bảo hành rõ ràng.", 'description' => "$name phù hợp nhu cầu gia đình, thông số minh bạch, giao hàng và bảo hành theo chính sách Điện Máy 365.", 'price' => $price, 'original_price' => $original, 'sale_price' => $price,
                    'stock' => 5 + ($position % 18), 'sold_count' => 18 + (($position * 17) % 240), 'is_available' => true, 'status' => 'active', 'badge' => $position % 3 === 0 ? 'Bán chạy' : 'Giá tốt', 'btu' => $item[5] ?? null, 'room_size' => $item[6] ?? null, 'inverter' => $categorySlug === 'dieu-hoa' ? true : null, 'cooling_type' => $categorySlug === 'dieu-hoa' ? 'Một chiều' : null, 'energy_rating' => $categorySlug === 'dieu-hoa' ? '5 sao' : null, 'warranty' => '24 tháng', 'seo_title' => $sku === 'DAI-ATKF35XVMV' ? 'Điều hòa Daikin 12000 BTU ATKF35XVMV giá tốt' : "$name giá tốt | Điện Máy 365", 'seo_description' => "Mua $name chính hãng, giá tốt, giao nhanh và bảo hành rõ ràng.",
                ]);
                $product->images()->updateOrCreate(['sort_order' => 0], ['url' => $images[$position % count($images)], 'alt_text' => $name, 'is_primary' => true]);
                $specs = [['Thương hiệu', $brands[$brandSlug]->name], ['Bảo hành', '24 tháng']];
                if ($categorySlug === 'dieu-hoa') {
                    $specs = [...$specs, ['Công suất', number_format($item[5], 0, ',', '.').' BTU'], ['Diện tích phòng', $item[6]], ['Công nghệ', 'Inverter']];
                }
                foreach ($specs as $order => [$spec,$value]) {
                    $product->specifications()->updateOrCreate(['name' => $spec], ['value' => $value, 'sort_order' => $order + 1]);
                }
                $position++;
            }
        }
    }
}
