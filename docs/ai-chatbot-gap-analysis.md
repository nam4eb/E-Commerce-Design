# AI chatbot gap analysis

## Current architecture

- Monorepo TypeScript dùng pnpm workspace. Backend thực tế là Express 5 (`artifacts/api-server`), không phải Next.js như giả định ban đầu. Frontend là React 19 + Vite (`artifacts/electronics-store`).
- PostgreSQL là database production; SQLite chỉ dùng cho development/test. Drizzle mô tả schema, còn bootstrap portable trong `lib/db/src/commerce.ts` tạo bảng cho cả hai engine.
- Sản phẩm nằm trong `shop_products`: phần giá và tồn kho là cột riêng, metadata sản phẩm nằm trong JSON `data`. Danh mục, thương hiệu, model, thông số và ảnh hiện nằm trong JSON, chưa có bảng riêng.
- Authentication dùng session cookie phía server (`shop_sessions`), có đăng nhập mật khẩu, Google và Facebook. API tự gắn user vào `res.locals.user`.
- Giỏ hàng nằm ở client; đơn hàng và kiểm tra giá/tồn kho khi checkout nằm ở server. Nội dung/chính sách/khuyến mãi nằm trong `shop_content`.
- UI dùng Tailwind và bộ component Radix/shadcn sẵn có. Không có state manager toàn cục; React state và helper API được dùng xuyên suốt.

## Existing reusable components

- `ProductCard`, route chi tiết `/products/:id`, formatter giá và cart action trong `App.tsx`.
- `AiChat` hiện có floating panel, loading, abort, stream, lịch sử tài khoản và xử lý lỗi.
- `shop-api.ts` cung cấp request helper cùng header chống cross-site write.

## Existing reusable APIs

- `GET /api/products` trả catalog cùng giá/tồn kho hiện thời, rating và số bán.
- Admin product APIs cập nhật giá/tồn kho và metadata; order API xác minh lại giá/tồn kho trong transaction.
- `GET /api/content/:kind` trả chính sách, bài viết, cửa hàng và khuyến mãi.
- `/api/auth/me` và session middleware là nguồn xác thực server-side.

## Existing database models

- Product, User, Session, Identity, Order, Payment, Content, Review, Support.
- Chatbot hiện có `shop_ai_chats` và `shop_ai_messages`, nhưng message chưa lưu intent, product, model, token và latency metadata.

## Missing chatbot components

- Chưa có intent/entity resolver, normalization/alias layer, product resolver hay product search service riêng.
- Handler hiện gửi catalog/chính sách vào LLM, trái với mục tiêu deterministic retrieval và chi phí thấp.
- Chưa có response type có cấu trúc, recommendation card, context nhẹ, guest memory-only, sync sau đăng nhập, hoặc analytics hooks.
- Chưa có skill deterministic, đặc biệt air-conditioner sizing, cùng unit/evaluation cases.
- Persistence chưa lưu technical metadata của message.

## Recommended implementation

1. Tạo module `src/ai` với types, normalization, intent/entity resolver, product service, response engine và skill router.
2. Trả lời giá, tồn kho, thông số, tìm kiếm và sizing trực tiếp từ database/rules; chỉ gọi model cho trường hợp cần diễn đạt FAQ/unknown.
3. Đổi `/api/ai/chat` sang response JSON có kiểu và context ngắn. Không gửi toàn bộ history/catalog vào model.
4. Guest chỉ giữ message trong React state. User đăng nhập được lưu server-side; thêm endpoint sync có feature flag.
5. Mở rộng schema message bằng các cột metadata nullable và giữ tương thích dữ liệu cũ.
6. Render compact product cards dùng route sản phẩm hiện tại.

## Files expected to change

- `artifacts/api-server/src/routes/ai-chat.ts`
- `artifacts/electronics-store/src/pages/ai-chat.tsx`
- `lib/db/src/commerce.ts`, `lib/db/src/schema/index.ts`
- tests, `.env.example`, `compose.yaml`, tài liệu.

## Files expected to create

- `artifacts/api-server/src/ai/*`
- `artifacts/api-server/src/ai/skills/air-conditioner/*`
- `tests/ai/chatbot-cases.json`
- `docs/ai-chatbot-implementation-report.md`

## Risks

- Product metadata là JSON tự do nên model/SKU/capacity phải được normalize khi đọc; dữ liệu admin không đầy đủ có thể khiến resolver chỉ trả kết quả gần đúng.
- Bootstrap schema hiện không có migration versioning; việc thêm cột phải idempotent cho cả PostgreSQL và SQLite.
- Thay stream text bằng typed JSON yêu cầu cập nhật đồng thời frontend và tests.
- Vercel AI Gateway có thể không hoạt động nếu billing/key/model chưa hợp lệ; deterministic answers phải tiếp tục hoạt động khi provider lỗi.

## Migration requirements

- Thêm các cột nullable `intent`, `product_id`, `model`, `input_tokens`, `output_tokens`, `latency_ms`, `response_type` vào `shop_ai_messages`.
- Không đổi hoặc xóa cột/bảng hiện hữu. Migration phải kiểm tra cột trước khi thêm để bảo toàn dữ liệu.
