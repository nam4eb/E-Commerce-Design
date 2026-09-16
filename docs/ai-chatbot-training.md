# AI Product Sales Assistant

## Dataset và split

Nguồn evaluation nằm tại `docs/ai_chatbot_training_dataset.jsonl` và bản CSV để kiểm tra thủ công. Mỗi record có `id`, `family_id`, `split`, `style`, `question`, `intent`, `skill`, `entities`, hành vi mong đợi và guardrail. Dataset chỉ được đọc bởi loader development/evaluation; HTTP chat không tải dataset.

- `train`: thiết kế rule và alias tổng quát.
- `validation`: kiểm tra threshold và normalization.
- `test`: holdout regression. Không thêm câu test nguyên văn vào `if/else`.

## Pipeline

```text
customer language
  -> normalization giữ nguyên model/SKU
  -> deterministic high-confidence intent + entity extraction
  -> small AI Gateway JSON classifier chỉ khi confidence thấp
  -> deterministic skill
  -> verified retrieval/ranking/policy data
  -> direct template hoặc grounded language generation
```

Taxonomy gồm đúng 59 intent của dataset tại `src/ai/taxonomy.ts`. `IntentResult` luôn có intent, confidence, entities và skill nếu phù hợp. Client chỉ gửi short context: sản phẩm, danh mục, intent và constraints gần nhất.

## Normalization và entities

Normalization hỗ trợ tiếng Việt không dấu, `bn`, `ko/k`, `dc`, máy lạnh/điều hòa, TV/tivi, BTU rút gọn và HP/ngựa. Model như `FTKB35`, `XPU12XKH-8`, `FV1412S3BA` được đọc từ chuỗi gốc trước khi xử lý ngôn ngữ.

Entities bao gồm brand/category/model/SKU, khoảng giá, diện tích/kích thước, BTU/HP, số người, loại phòng, tải nhiệt, khoảng cách xem TV, feature bắt buộc/loại trừ, số lượng và tồn kho. Correction ghi đè constraint mới; follow-up dùng short context.

## Skills và retrieval

`AIR_CONDITIONER_SIZING` đã hoàn chỉnh bằng TypeScript với rule cấu hình tập trung. Skill registry khai báo các advisor/sizing tiếp theo và đánh dấu rõ skill chưa triển khai. Product retrieval ưu tiên model chính xác, sau đó structured filters; giá, tồn kho và specs luôn lấy từ database.

Ranking bán chạy chỉ dùng số lượng sản phẩm trong đơn `Đã giao`. Không có metric thì trả limitation. Trending, market share hoặc mức hài lòng cũng không được suy đoán.

## Response strategy

- Giá, tồn kho, exact lookup và sizing: template trực tiếp.
- Policy/giải thích: AI nhỏ chỉ diễn đạt verified context.
- Advice: skill trước, retrieval sau, AI chỉ là bước tùy chọn.
- Thiếu dữ liệu: trả limitation hoặc hỏi đúng một câu giúp tăng độ chính xác.

## Chạy kiểm thử và evaluation

```powershell
pnpm run typecheck
pnpm run test:commerce
pnpm run eval:ai
pnpm run build
```

Evaluation tạo `docs/ai-chatbot-evaluation-report.json`, đo intent, skill routing, entity và các intent quan trọng. `extract_if_present` chỉ được chấm khi câu thực sự cung cấp literal; câu hỏi ngược như “phù hợp mấy người” không bị coi là thiếu input.

## Mở rộng

Thêm intent: cập nhật dataset trước, thêm tên vào taxonomy nếu dataset bổ sung intent mới, thêm rule tổng quát, response strategy và chạy full eval.

Thêm skill: implement `AISkill`, đăng ký trong registry, viết test biên và chỉ route khi input đủ. Logic tính toán không đặt trong prompt.

Regression production: ẩn danh câu hỏi, thêm một canonical family và paraphrase vào JSONL, đặt cùng split, mô tả expected action/backend source/must-not, viết test hành vi, sửa rule tổng quát rồi chạy test và full eval. Không lưu PII hoặc nội dung chat guest.
