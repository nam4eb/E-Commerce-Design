# AI chatbot training implementation report

## Kết quả

Hai lỗi gốc đã được sửa. Sizing 20 m² chạy calculator trước retrieval và chọn lớp 12.000 BTU trong điều kiện bình thường. Best-seller Midea đi qua ranking từ đơn đã giao; khi chưa có metric, chatbot nói rõ không thể xác minh.

Evaluation trên 116 validation + 120 test:

- Intent accuracy: **100%**.
- Skill routing accuracy: **100%**.
- Critical commerce intents: **100%**.
- Entity extraction: **98,98%**.
- Forbidden hallucination violations: **0**.
- Failed intent cases: **0**.

Chi tiết máy đọc được nằm trong `docs/ai-chatbot-evaluation-report.json`.

## Thay đổi chính

- `taxonomy.ts`: 59 intent và mapping skill theo dataset.
- `normalization.ts`, `entities.ts`, `intent.ts`: normalization, extraction và hybrid resolver.
- `skills/registry.ts`: interface/registry cho skill deterministic.
- `ranking-service.ts`: ranking từ item của đơn đã giao.
- `product-service.ts`: structured filters, capacity, feature exclusion và in-stock.
- `chat-engine.ts`: response strategy theo intent, limitation minh bạch và short context.
- `evaluation/dataset.ts`, `eval-ai-chatbot.ts`: loader và evaluation harness.
- Tests: contrast/routing, sizing, follow-up, guest persistence và best-seller guardrail.

Không có migration database mới cho phần training. `ChatContext` có thêm `constraints`; schema persistence và quy tắc guest/auth vẫn giữ nguyên.

## Hạn chế

- Các skill máy giặt, tủ lạnh, TV, máy nước nóng, máy lọc, máy sấy và hút bụi đã có routing/registry nhưng chưa phải tất cả đều có calculator hoàn chỉnh.
- Promotion và variant chưa có service dữ liệu riêng đủ mạnh.
- Trending chưa có analytics metric đã xác minh.
- Midea từ Excel vẫn là draft cho tới khi admin nhập giá/tồn kho và xuất bản.

Ưu tiên tiếp theo: washing-machine sizing, refrigerator sizing, TV size advisor, energy estimator dựa trên thông số điện chuẩn hóa, rồi promotion service.
