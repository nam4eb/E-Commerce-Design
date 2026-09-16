# AI chatbot training gap analysis

## Kiến trúc trước thay đổi

- HTTP: `POST /api/ai/chat`; lịch sử tài khoản tại `/api/ai/chats`.
- Guest chỉ giữ tin nhắn trong RAM trình duyệt; tài khoản đăng nhập được lưu trong `shop_ai_chats` và `shop_ai_messages`.
- Catalog, giá và tồn kho lấy từ `shop_products`; đơn hàng lưu trong `shop_orders`.
- Resolver cũ chỉ có 12 intent và dựa trên một chuỗi `includes`.
- Skill điều hòa đã tính deterministic, nhưng được gọi qua intent `PRODUCT_ADVICE`.
- AI Gateway chỉ diễn đạt nội dung đã xác minh; không dùng để tạo giá hoặc tồn kho.

## Case A: sizing điều hòa 20 m²

`Phòng ngủ 20m² dùng điều hòa bao nhiêu BTU?` trước đây được resolver trả về `PRODUCT_ADVICE`. Điều kiện trong chat engine có thể chạy sizing khi có diện tích, nhưng taxonomy không mô tả đúng pipeline và một số biến thể câu bị rơi vào product search. Retrieval cũng có thể xếp mẫu 9.000 BTU cao hơn do score tồn kho/keyword.

Đã sửa bằng intent riêng `AIR_CONDITIONER_SIZING` và `AIR_CONDITIONER_HEAT_LOAD`. Backend luôn chạy calculator trước, đổi kết quả sang mức công suất thương mại rồi mới search với `capacityBTU` và `inStock=true`. Trường hợp 20 m² bình thường trả mức 12.000 BTU; hướng Tây/tầng áp mái được tăng tải theo rule cấu hình.

## Case B: Midea bán chạy

`top những điều hòa Midea bán chạy nhất` trước đây không có intent tương ứng nên rơi vào fallback chung. Hệ thống cũng chưa có ranking service.

Đã sửa bằng `BEST_SELLER` và `getBestSellers()`. Service chỉ cộng số lượng item trong đơn trạng thái `Đã giao`, mặc định trong 30 ngày. Khi không có đơn đủ điều kiện hoặc không có sản phẩm Midea đã xuất bản, response trả `NO_VERIFIED_SALES_METRIC` và nói rõ chưa thể xác minh, không dùng giá, tồn kho hay thứ tự ngẫu nhiên để gọi là bán chạy.

## Khoảng trống còn lại

- Catalog Excel mới đang ở bản nháp nên chưa tham gia retrieval đến khi có giá, tồn kho và được xuất bản.
- Promotion chưa có bảng dữ liệu có cấu trúc riêng.
- Các skill ngoài điều hòa đã có registry và routing nhưng một số mới trả limitation cho tới khi có rule nghiệp vụ và schema đủ dữ liệu.
- Ranking theo lượt xem/trending chưa có nguồn analytics đã xác minh.
