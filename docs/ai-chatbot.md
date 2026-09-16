# AI Product Sales Assistant

## Kiến trúc và request flow

Chatbot chạy trong stack hiện tại React/Vite → Express → PostgreSQL. Mỗi câu hỏi đi qua chuỗi:

```text
validate → intent → entity normalization → skill/product service → database → typed response
```

Database là nguồn giá, tồn kho, SKU/model và thông số. LLM không truy cập SQL và không nhận toàn bộ catalog. Các câu giá, tồn kho, thông số, tìm kiếm, so sánh và sizing được backend trả lời trực tiếp. LLM nhỏ chỉ diễn đạt đoạn chính sách/knowledge đã được backend truy xuất; khi provider lỗi, backend dùng nội dung xác thực làm fallback.

`POST /api/ai/chat` nhận:

```json
{
  "message": "ATKF35XVMV còn hàng không?",
  "conversationId": "optional-uuid",
  "context": {
    "lastProductId": "ac-02",
    "lastCategoryId": "air-conditioner",
    "lastIntent": "PRODUCT_PRICE"
  }
}
```

Response chứa `message`, `intent`, `responseType`, context mới, product cards tùy chọn và recommendation có cấu trúc. Không gửi history cho LLM.

## Authentication và persistence

- Guest giữ message/context trong React state. Refresh hoặc đóng tab sẽ xóa chat; server không ghi nội dung guest.
- User đăng nhập được xác định từ session cookie phía server. Mỗi cặp user/assistant được lưu cùng intent, product, response type, model/token/latency nếu có.
- Khi guest đăng nhập giữa chat, frontend gọi `POST /api/ai/conversations/sync`. Endpoint kiểm tra session, ownership, role, kích thước và tổng dung lượng trước khi import.
- Đặt `AI_CHAT_SYNC_ENABLED=false` để tắt sync mà không bỏ endpoint hoặc UI.

## Intent và entity

Các intent V1: greeting, price, stock, info, spec, search, advice, compare, warranty, shipping, store policy và unknown. Resolver dùng rules/keyword nhanh, không gọi model.

Entity extractor nhận model/SKU, brand, category alias, khoảng giá, diện tích, BTU/HP, inverter, số người, độ cao trần, hướng Tây, tầng áp mái, kính lớn và nguồn nhiệt. Alias/normalization nằm trong `src/ai/normalization.ts`; thêm alias theo category tại đây thay vì rải magic string qua handler.

Product resolver ưu tiên model/SKU normalized, sau đó brand/category/keyword. Product service đọc giá và stock từ cột database tại thời điểm request; metadata từ JSON product. Search trả tối đa năm sản phẩm và ưu tiên còn hàng.

## Air-conditioner sizing

Calculator TypeScript độc lập model nằm tại `src/ai/skills/air-conditioner/calculator.ts`:

- Baseline 600 BTU/m², cấu hình tập trung trong `airConditionerRules`.
- Điều chỉnh theo trần cao, hướng Tây, tầng áp mái, kính lớn, nguồn nhiệt và số người.
- Làm tròn lên capacity thương mại: 9.000, 12.000, 18.000, 24.000, 28.000 hoặc 36.000 BTU.
- Trả estimated BTU, commercial BTU, HP, heat load, giải thích và yếu tố quan trọng còn thiếu.
- Sau sizing, product service tìm tối đa năm máy có capacity tương ứng từ catalog hiện tại.

## UI và analytics hooks

Widget có open/close, loading, abort, error/retry, clear, history cho tài khoản và compact product card dẫn tới route chi tiết hiện tại. UI phát `CustomEvent("shop:analytics")` cho `chat_opened`, `question_sent`, `product_recommended`, `product_clicked`, `chat_error`; hệ thống analytics tương lai có thể subscribe mà không đổi chatbot.

## AI Gateway

```dotenv
AI_GATEWAY_API_KEY=khóa-của-bạn
AI_MODEL=model-id-trong-vercel
AI_CHAT_SYNC_ENABLED=true
```

Không đặt secret trong `VITE_*`. Chat deterministic vẫn hoạt động khi chưa có Gateway. Vercel có thể yêu cầu phương thức thanh toán để kích hoạt credit. Model chỉ dùng cho knowledge/policy cần diễn đạt.

Docker:

```powershell
docker compose up --build -d api web
docker compose ps
```

## Thêm intent

1. Thêm literal vào `ChatIntent` trong `src/ai/types.ts`.
2. Thêm rule ưu tiên phù hợp trong `src/ai/intent.ts`.
3. Thêm retrieval/response branch trong `src/ai/chat-engine.ts`.
4. Thêm evaluation case và test hành vi, tập trung vào dữ liệu/metadata thay vì exact prose.

## Thêm skill mới

Ví dụ `washing-machine-sizing`:

1. Tạo `src/ai/skills/washing-machine/schema.ts`, `extractor.ts`, `rules.ts`, `calculator.ts`.
2. Input/output phải có kiểu và calculator phải deterministic, không gọi LLM.
3. Đăng ký trigger ở intent/entity và gọi skill từ chat engine.
4. Dùng product service với structured filter để lấy sản phẩm thật.
5. Thêm unit tests cho normal, boundary, missing và invalid input.

Pattern tương tự áp dụng cho refrigerator sizing, TV size advisor, water heater, air purifier và energy saving advisor.

## Test và xử lý lỗi

```powershell
node scripts/test-commerce.mjs
node node_modules/typescript/bin/tsc --build
docker compose up --build -d api web
```

Các fallback xử lý input rỗng/dài, product không tìm thấy, câu hỏi mơ hồ, provider lỗi/timeout, rate limit và lỗi database qua error middleware hiện tại. Không log full guest message hoặc secret; log kỹ thuật chỉ có request ID, intent, latency, model, response type, product count và trạng thái authentication.

Evaluation cases nằm tại `tests/ai/chatbot-cases.json`.

Tài liệu tham khảo: [Vercel Chatbot](https://chatbot.ai-sdk.dev/docs), [AI Gateway REST API](https://vercel.com/docs/ai-gateway/openai-compat/rest-api), [models and providers](https://vercel.com/docs/ai-gateway/models-and-providers).
