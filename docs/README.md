# AI Chatbot Training / Evaluation Dataset

RAG architecture and operation: [ai-rag.md](./ai-rag.md). Implementation status: [ai-rag-implementation-report.md](./ai-rag-implementation-report.md).

Dataset này dành cho dự án **E-commerce-design**.

## Mục tiêu

Đây không phải product-catalog fine-tuning dataset. Nó là bộ dữ liệu hành vi để:

- huấn luyện/hiệu chỉnh Intent Resolver;
- kiểm tra Entity Extraction;
- ánh xạ câu hỏi vào backend Skill;
- kiểm thử Product Retrieval;
- kiểm thử guardrails chống hallucination;
- tạo regression/evaluation suite cho chatbot.

## Thống kê

- Tổng số câu: **871**
- Số intent: **59**
- Train: **635**
- Validation: **116**
- Test: **120**

### Các intent

- `AFTER_SALES`: 14
- `AIR_CONDITIONER_HEAT_LOAD`: 15
- `AIR_CONDITIONER_SIZING`: 59
- `AIR_CONDITIONER_USAGE_ADVICE`: 15
- `AIR_PURIFIER_ADVICE`: 12
- `AIR_PURIFIER_SIZING`: 15
- `AMBIGUOUS_MODEL`: 13
- `BEST_BY_CRITERIA`: 13
- `BEST_SELLER`: 17
- `BRAND_ADVICE`: 14
- `BRAND_SEARCH`: 15
- `BUDGET_SEARCH`: 14
- `CATEGORY_DISCOVERY`: 15
- `COMMERCIAL_B2B`: 14
- `COMPATIBILITY`: 15
- `COOKING_APPLIANCE_ADVICE`: 12
- `CORRECTION`: 14
- `DISHWASHER_ADVICE`: 11
- `DRYER_ADVICE`: 13
- `ENERGY_ESTIMATE`: 14
- `FEATURE_COMPARE`: 11
- `FEATURE_RANKING`: 3
- `FEATURE_SEARCH`: 13
- `FOLLOW_UP_CONTEXT`: 12
- `GREETING`: 13
- `HUMAN_HANDOFF`: 13
- `INCOMPLETE_REQUEST`: 13
- `INSTALLATION`: 14
- `MULTI_CONSTRAINT_SEARCH`: 50
- `NEGATIVE_REQUIREMENT`: 15
- `NO_RESULTS`: 14
- `OUT_OF_SCOPE`: 11
- `POPULAR_TRENDING`: 13
- `PRICE_COMPARE`: 13
- `PRICE_RANKING`: 3
- `PRODUCT_ADVICE`: 18
- `PRODUCT_COMPARE`: 12
- `PRODUCT_PRICE`: 20
- `PRODUCT_PROMOTION`: 14
- `PRODUCT_SEARCH_EXACT`: 13
- `PRODUCT_SEARCH_FUZZY`: 14
- `PRODUCT_STOCK`: 17
- `PRODUCT_TECH_EXPLAIN`: 13
- `PRODUCT_USAGE_GUIDANCE`: 13
- `QUOTE_REQUEST`: 15
- `REFRIGERATOR_ADVICE`: 15
- `REFRIGERATOR_SIZING`: 15
- `RETURN_EXCHANGE`: 13
- `SHIPPING`: 15
- `TV_ADVICE`: 11
- `TV_SIZING`: 13
- `UNKNOWN_DATA`: 14
- `VACUUM_ADVICE`: 10
- `VARIANT_AVAILABILITY`: 15
- `WARRANTY`: 13
- `WASHING_MACHINE_ADVICE`: 15
- `WASHING_MACHINE_SIZING`: 15
- `WATER_HEATER_ADVICE`: 10
- `WATER_HEATER_SIZING`: 13

## Schema mỗi record

- `id`: mã record.
- `family_id`: nhóm semantic; các paraphrase cùng family được giữ cùng split để giảm data leakage.
- `split`: `train` / `validation` / `test`.
- `style`: `natural` / `no_accent` / `slang`.
- `question`: câu người dùng.
- `intent`: intent mong đợi.
- `skill`: backend skill phải chạy nếu có.
- `entities`: entity mong đợi hoặc chỉ dẫn extract.
- `expected_action`: hành vi backend mong đợi.
- `backend_sources`: nguồn dữ liệu bắt buộc.
- `response_strategy`: chiến lược trả lời.
- `must_do`: hành vi bắt buộc.
- `must_not`: hành vi cấm.
- `clarification_question`: hướng hỏi lại khi thiếu dữ liệu.
- `notes`: ghi chú.

## Nguyên tắc sử dụng

1. **Không nhét toàn bộ dataset vào system prompt.**
2. Product price/stock/spec/ranking phải lấy từ backend, không fine-tune vào model.
3. Dùng `train` để thiết kế classifier/rules/few-shot nhỏ.
4. Dùng `validation` để tune threshold/normalization.
5. Giữ `test` làm regression suite, không dùng để viết rules theo từng câu.
6. Mọi skill tính toán (BTU, tải máy giặt, dung tích tủ lạnh, TV size...) phải là TypeScript deterministic logic.
7. Sau mỗi bug thực tế, thêm 1 regression case mới vào dataset.
