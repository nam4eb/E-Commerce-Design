# Chatbot AI cho Điện Máy 365

Chatbot được chuyển thể theo kiến trúc và trải nghiệm của [Vercel Chatbot template](https://vercel.com/templates/next.js/chatbot): phản hồi streaming, lịch sử hội thoại và khả năng đổi model. Dự án hiện tại dùng React/Vite và Express nên phần tích hợp được viết trực tiếp vào stack sẵn có, không thêm một ứng dụng Next.js thứ hai.

## Cấu hình AI Gateway

1. Đăng nhập Vercel, mở AI Gateway → API Keys và tạo một khóa dành riêng cho môi trường này. Vercel có thể yêu cầu thêm thẻ để xác minh tài khoản trước khi kích hoạt credit, kể cả khi đang dùng free tier.
2. Trong AI Gateway, chọn model đang có quyền sử dụng và sao chép đúng model ID, gồm cả tên provider, ví dụ định dạng `provider/model`.
3. Điền hai biến sau vào `.env` ở thư mục gốc:

```dotenv
AI_GATEWAY_API_KEY=khóa-của-bạn
AI_MODEL=model-id-chính-xác-từ-dashboard
```

4. Không đặt khóa vào biến `VITE_*`; các biến này sẽ được đóng vào bundle trình duyệt. `.env` đã bị Git bỏ qua.
5. Kiểm tra mà không in giá trị khóa:

```powershell
node scripts/check-config.mjs
```

6. Với Docker, rebuild API và frontend để bật nút chat:

```powershell
docker compose up --build -d api web
docker compose ps
```

Mở `http://localhost:8080`, nút bong bóng chat nằm góc phải dưới. Nếu chưa có nút, kiểm tra cả hai biến đã có trong container và restart API. Không dán khóa vào log hoặc gửi khóa qua hỗ trợ.

Ứng dụng gọi REST streaming tại `https://ai-gateway.vercel.sh/v1/chat/completions`, đúng giao diện OpenAI-compatible được Vercel công bố. Có thể đổi model chỉ bằng `AI_MODEL` rồi restart API; không cần build lại frontend nếu chatbot đã được bật trong lần tải trang hiện tại, nhưng rebuild/recreate bằng lệnh trên là cách rõ ràng nhất trong Docker.

## Phạm vi hoạt động

- Chatbot nhận catalog hiện hành, tồn kho, thông số và các trang chính sách công khai từ database ở thời điểm gửi câu hỏi.
- Bot được yêu cầu trả lời tiếng Việt, nêu mã sản phẩm và thừa nhận khi dữ liệu không đủ.
- Dữ liệu đơn hàng, email, số điện thoại và địa chỉ không được đưa vào prompt. Với câu hỏi trạng thái đơn hoặc thanh toán, bot hướng khách đến Tài khoản hoặc Hỗ trợ.
- Không yêu cầu khách gửi mật khẩu, OTP, số thẻ hoặc khóa bí mật. Giao diện cũng hiển thị cảnh báo AI có thể nhầm.
- Khách chưa đăng nhập giữ tối đa 12 tin gần nhất trong localStorage của trình duyệt. Người đăng nhập lưu hội thoại trong PostgreSQL, xem lại hoặc xóa trong bảng lịch sử.
- Mỗi IP được gửi tối đa 15 yêu cầu trong 10 phút tại một tiến trình API. Khi chạy nhiều replica, cần chuyển rate limit sang Redis/API gateway hoặc reverse proxy dùng chung.
- Tin nhắn người dùng tối đa 2.000 ký tự; lịch sử và output được giới hạn để kiểm soát chi phí. API timeout sau 45 giây.

## Kiểm tra và xử lý lỗi

```powershell
docker compose logs --tail=200 api web
```

| Hiện tượng                                 | Nguyên nhân thường gặp                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Không có nút chat                          | Thiếu AI_GATEWAY_API_KEY hoặc AI_MODEL; container chưa được recreate.       |
| “Chatbot AI chưa được cấu hình”            | API không nhận đủ hai biến môi trường.                                      |
| “AI Gateway chưa được xác minh thanh toán” | Vào Vercel AI Gateway và thêm phương thức thanh toán để mở khóa credit.     |
| “Khóa AI Gateway không hợp lệ”             | Tạo lại API key, cập nhật `.env`, rồi recreate container API.               |
| “Model AI chưa hợp lệ”                     | Chọn model loại text trong Model List và sao chép đúng ID `provider/model`. |
| “Dịch vụ AI chưa phản hồi được”            | AI Gateway lỗi, phản hồi rỗng hoặc container không có kết nối Internet.     |
| HTTP 429                                   | Đã vượt giới hạn cục bộ hoặc quota/rate limit của Gateway.                  |
| Chat dừng giữa câu                         | Kết nối client/Gateway bị ngắt hoặc quá timeout; gửi lại sau.               |
| Không thấy lịch sử                         | Khách chưa đăng nhập; lịch sử guest chỉ nằm ở trình duyệt hiện tại.         |

Chạy kiểm thử trước triển khai:

```powershell
node scripts/test-commerce.mjs
pnpm run typecheck
pnpm run build
```

Test tự động mô phỏng stream từ Gateway, không tiêu token và không xác nhận khóa thật. Sau khi cấu hình, thử một câu hỏi catalog và kiểm tra usage/chi phí trong AI Gateway. Cấu hình ngân sách và cảnh báo chi phí ở tài khoản Vercel trước khi mở cho khách.

Tài liệu chính thức: [Vercel Chatbot](https://chatbot.ai-sdk.dev/docs), [AI Gateway REST API](https://vercel.com/docs/ai-gateway/openai-compat/rest-api), [xác thực và BYOK](https://vercel.com/docs/ai-gateway/authentication-and-byok).
