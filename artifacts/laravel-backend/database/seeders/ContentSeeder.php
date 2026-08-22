<?php

namespace Database\Seeders;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $author = User::updateOrCreate(['email' => 'editor@dienmay365.test'], ['name' => 'Ban biên tập Điện Máy 365', 'password' => Hash::make(env('DEMO_ADMIN_PASSWORD', 'ChangeMe123!')), 'role' => 'admin', 'email_verified_at' => now()]);
        $articles = [
            ['title' => 'Cách chọn công suất điều hòa phù hợp diện tích phòng', 'slug' => 'cach-chon-cong-suat-dieu-hoa-phu-hop-dien-tich-phong', 'excerpt' => 'Hướng dẫn tham khảo công suất BTU theo diện tích, hướng nắng và số người sử dụng.', 'content' => "Công suất điều hòa cần được chọn theo diện tích và điều kiện thực tế của phòng. Phòng dưới 15 m² thường tham khảo mức 9.000 BTU; phòng 15–20 m² thường tham khảo 12.000 BTU.\n\nCần tăng công suất dự kiến nếu phòng chịu nắng nhiều, trần cao hoặc thường xuyên có đông người. Hãy kiểm tra thông số của từng model và khảo sát lắp đặt trước khi quyết định.", 'image' => 'https://images.pexels.com/photos/3637739/pexels-photo-3637739.jpeg?auto=compress&cs=tinysrgb&w=1200', 'sku' => 'DAI-ATKF35XVMV'],
            ['title' => 'Nên chọn tủ lạnh dung tích bao nhiêu cho gia đình?', 'slug' => 'nen-chon-tu-lanh-dung-tich-bao-nhieu-cho-gia-dinh', 'excerpt' => 'Các yếu tố cần cân nhắc khi chọn dung tích tủ lạnh cho số thành viên và thói quen lưu trữ.', 'content' => "Dung tích phù hợp phụ thuộc số thành viên, tần suất đi chợ và nhu cầu trữ đông. Gia đình nên chừa khoảng trống lưu thông khí thay vì sử dụng kín toàn bộ ngăn tủ.\n\nNgoài dung tích, hãy so sánh kích thước lắp đặt, mức tiêu thụ điện, độ ồn và chính sách bảo hành.", 'image' => 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=1200', 'sku' => 'LG-GND372BL'],
            ['title' => 'Kinh nghiệm chọn máy giặt tiết kiệm điện cho gia đình', 'slug' => 'kinh-nghiem-chon-may-giat-tiet-kiem-dien-cho-gia-dinh', 'excerpt' => 'So sánh khối lượng giặt, công nghệ inverter và chương trình giặt theo nhu cầu thực tế.', 'content' => "Khối lượng giặt nên được chọn theo số thành viên và tần suất giặt. Công nghệ inverter giúp máy vận hành ổn định và tối ưu điện năng.\n\nHãy cân nhắc kích thước vị trí đặt máy, tốc độ vắt, độ ồn và chương trình chăm sóc vải trước khi mua.", 'image' => 'https://images.pexels.com/photos/5591465/pexels-photo-5591465.jpeg?auto=compress&cs=tinysrgb&w=1200', 'sku' => 'EL-EWF1024P5WB'],
            ['title' => '5 tiêu chí chọn Smart Tivi phù hợp phòng khách', 'slug' => '5-tieu-chi-chon-smart-tivi-phu-hop-phong-khach', 'excerpt' => 'Chọn kích thước màn hình, độ phân giải và nền tảng thông minh phù hợp khoảng cách xem.', 'content' => "Khoảng cách xem quyết định kích thước màn hình phù hợp. Với phòng khách phổ biến, tivi từ 50 đến 65 inch thường đem lại trải nghiệm cân bằng.\n\nNgoài hình ảnh, cần kiểm tra hệ điều hành, cổng kết nối, chất lượng âm thanh và chính sách bảo hành.", 'image' => 'https://images.pexels.com/photos/6976094/pexels-photo-6976094.jpeg?auto=compress&cs=tinysrgb&w=1200', 'sku' => 'SS-UA55DU8000'],
        ];
        foreach ($articles as $index => $data) {
            $article = Article::updateOrCreate(['slug' => $data['slug']], ['author_id' => $author->id, 'title' => $data['title'], 'excerpt' => $data['excerpt'], 'content' => $data['content'], 'featured_image' => $data['image'], 'status' => ArticleStatus::Published, 'published_at' => now()->subDays($index + 1), 'seo_title' => $data['title'].' | Điện Máy 365', 'seo_description' => $data['excerpt']]);
            $article->products()->sync(array_filter([Product::where('sku', $data['sku'])->value('id')]));
        }
    }
}
