# Chức năng bán hàng

## Luồng đã triển khai

- Catalog lấy từ API và database. Seed có chủ đích bằng `SEED_CATALOG=true`; dữ liệu seed là catalog minh họa, cần thay bằng hàng hóa thật trước vận hành.
- Giỏ hàng lưu ID/số lượng trong localStorage. Giá/tồn kho được lấy lại từ API. Mua ngay điều hướng trong ứng dụng, không tải lại trang.
- Đăng ký, đăng nhập, đăng xuất, hồ sơ và yêu thích được lưu ở máy chủ. Mật khẩu dùng scrypt và salt riêng; token phiên ngẫu nhiên được băm trong database, cookie HttpOnly/SameSite, hết hạn sau 7 ngày.
- Khách đăng nhập mới đặt hàng. API kiểm tra người nhận, số lượng, phương thức thanh toán; tự tính giá, phí giao hàng và lắp đặt. Từ 10 triệu miễn phí giao hàng; dưới ngưỡng phí 35.000đ; lắp đặt tùy chọn 250.000đ.
- Tạo đơn và trừ kho trong một transaction, kiểm tra tồn kho ngay tại UPDATE. Khóa idempotency theo khách hàng ngăn gửi lặp trừ kho hai lần. Trình duyệt giữ khóa của lần gửi chưa có kết quả trong sessionStorage.
- Khách chỉ được đọc đơn của mình. Trang thành công cũ không còn phát sinh đơn giả. Theo dõi đơn bằng `/orders/:id`.
- Admin xem đơn, cập nhật trạng thái, sửa giá/tồn kho. Hủy trước khi giao hoàn lại kho đúng một lần. API kiểm tra quyền ở máy chủ.
- COD, VNPAY và MoMo được hỗ trợ. Google/Facebook OAuth và các chức năng nội dung/hỗ trợ/đánh giá đã bổ sung. Xem [hướng dẫn cấu hình chi tiết](social-login-payments.md). Giao hàng không tự xác nhận thu COD.

## Chạy trên Windows / Node 24

Tại thư mục gốc, chạy `pnpm install`. Script cài đặt và các native dependencies đã hỗ trợ Windows x64.

PowerShell, cửa sổ API:

```powershell
$env:DATABASE_FILE = 'D:\Project\E-Commerce-Design\.data\shop.sqlite'
$env:SEED_CATALOG = 'true'
$env:PORT = '5000'
pnpm --filter @workspace/api-server run dev
```

Cửa sổ frontend:

```powershell
pnpm --filter @workspace/electronics-store run dev
```

Frontend mặc định ở `http://localhost:5173`, proxy `/api` tới `http://127.0.0.1:5000`. Có thể đổi bằng `API_PROXY_TARGET`. Không dùng chung biến PORT=5000 cho cả hai tiến trình.

Tạo admin ban đầu: đặt `ADMIN_EMAIL` và `ADMIN_PASSWORD` (từ 12 ký tự) trong môi trường API rồi khởi động. Không có mật khẩu mặc định. Không tự nâng quyền một email khách hàng đã tồn tại. Bỏ các biến bootstrap sau khi tạo admin. Đăng nhập qua trang Tài khoản, sau đó mở Quản trị.

## PostgreSQL và triển khai

- Đặt `DATABASE_URL` đến PostgreSQL dành cho ứng dụng. Database cần tồn tại; tài khoản kết nối cần quyền tạo bảng cho lần bootstrap đầu.
- Khi có DATABASE_URL, SQLite không được dùng. Khi NODE_ENV=production, bắt buộc PostgreSQL; SQLite chỉ phục vụ phát triển/test.
- Bootstrap tạo các bảng `shop_products`, `shop_users`, `shop_sessions`, `shop_orders` bằng CREATE TABLE IF NOT EXISTS, không xóa dữ liệu. Schema Drizzle nằm ở `lib/db/src/schema/index.ts`. Thay đổi schema về sau cần migration được rà soát; bootstrap hiện chỉ dành cho schema đầu tiên.
- Production cần HTTPS để gửi cookie Secure và reverse proxy cùng origin cho `/api`. Không mở CORS mặc định. Mutation từ trình duyệt yêu cầu `X-Store-Request: 1` và từ chối Fetch Metadata cross-site.
- Giới hạn đăng nhập hiện theo IP trong bộ nhớ tiến trình; nếu triển khai nhiều instance, dùng giới hạn tập trung tại reverse proxy/shared storage.
- Catalog seed là dữ liệu minh họa. Sao/đánh giá và số đã bán lấy từ dữ liệu thật. Nội dung mặc định cần điều chỉnh theo cửa hàng.

## API

Body JSON, lỗi dạng `{ "message": "..." }`. Gửi cookie cùng origin. Header `X-Store-Request: 1` bắt buộc với POST/PATCH/PUT.

| Method | Path (sau /api) | Chức năng |
|---|---|---|
| GET | /products | Catalog, giá và tồn kho |
| GET | /auth/me | Phiên hiện tại hoặc null |
| POST | /auth/register | name, email, password |
| POST | /auth/login | email, password |
| POST | /auth/logout | Hủy phiên |
| PATCH | /account | name, phone, address |
| PUT | /account/wishlist | ids: string[] |
| GET | /orders | Đơn của khách hiện tại |
| GET | /orders/:id | Chi tiết, chỉ chủ đơn |
| POST | /orders | recipient {name,phone,address,city,note}, items [{id,qty}], method: cod/vnpay/momo, install: boolean, expectedSubtotal; header Idempotency-Key |
| GET | /admin/orders | Tất cả đơn, yêu cầu admin |
| PATCH | /admin/orders/:id | status, kiểm tra chuyển trạng thái |
| PATCH | /admin/products/:id | price, stock (số nguyên) |

Chuyển trạng thái: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao. Có thể hủy từ Chờ xác nhận hoặc Đã xác nhận. Không hủy lặp hoặc lùi trạng thái.

## Kiểm tra

```powershell
pnpm run typecheck
pnpm run test:commerce
pnpm run build
```

Test tích hợp dùng SQLite trong thư mục tạm riêng: quyền truy cập, cookie, cập nhật hồ sơ, validation, giá máy chủ, rollback nhiều sản phẩm, tranh mua đơn vị cuối, idempotency đồng thời, hoàn kho, logout và lưu dữ liệu qua lần mở lại. Không chạm database đang cấu hình của người dùng. PostgreSQL cần kiểm thử riêng trên môi trường triển khai thực tế.
