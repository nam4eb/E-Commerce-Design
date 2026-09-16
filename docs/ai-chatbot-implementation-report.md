# AI chatbot implementation report

## What was implemented

- Pipeline typed intent → entity → product/skill retrieval → response.
- Direct verified answers for price, stock, product info/spec, search and comparison.
- Deterministic air-conditioner sizing with heat-load adjustments and catalog recommendations.
- Lightweight provider abstraction for knowledge/policy wording without catalog-in-prompt.
- Memory-only guest UI, authenticated persistence, guest-to-login sync, retry and product cards.
- Technical metadata, privacy-safe logs and analytics event hooks.

## Files created

- `artifacts/api-server/src/ai/types.ts`
- `artifacts/api-server/src/ai/normalization.ts`
- `artifacts/api-server/src/ai/intent.ts`
- `artifacts/api-server/src/ai/entities.ts`
- `artifacts/api-server/src/ai/product-service.ts`
- `artifacts/api-server/src/ai/provider.ts`
- `artifacts/api-server/src/ai/chat-engine.ts`
- `artifacts/api-server/src/ai/skills/air-conditioner/calculator.ts`
- `tests/ai/chatbot-cases.json`
- `docs/ai-chatbot-gap-analysis.md`

## Files modified

- AI route/widget, database bootstrap/Drizzle schema, environment/Compose configuration, integration/unit tests and chatbot documentation.

## Database migrations

`shop_ai_messages` nhận thêm các cột nullable: `intent`, `product_id`, `model`, `input_tokens`, `output_tokens`, `latency_ms`, `response_type`. Bootstrap chạy ALTER idempotent và giữ nguyên dữ liệu cũ.

## Environment variables

- `AI_GATEWAY_API_KEY`: optional cho deterministic flow, cần cho policy generation.
- `AI_MODEL`: model ID Vercel AI Gateway.
- `AI_CHAT_SYNC_ENABLED`: bật/tắt guest-to-login sync, mặc định `true`.

## Supported intents and skills

Greeting, product price/stock/info/spec/search/advice/compare, warranty, shipping, store policy, unknown. Skill V1: `AIR_CONDITIONER_SIZING`.

## Current limitations

- Catalog dùng JSON metadata nên chưa có PostgreSQL full-text index riêng.
- Catalog seed hiện có `ATKF35XVMV` nhưng không có `FTKB35`; chatbot sẽ không gán nhầm hai model và sẽ yêu cầu model hợp lệ. Nếu admin thêm FTKB35 vào catalog, resolver sẽ dùng giá/tồn kho của record đó ngay lập tức.
- Product aliases hiện là structured code configuration; chưa có admin UI/table.
- Product cards tải lại từ history chỉ có text vì message persistence chưa lưu snapshot recommendation JSON.
- Promotion relation hiện chưa đủ chuẩn hóa để giải thích mọi khuyến mãi theo sản phẩm.

## Test results

Unit cases kiểm tra 15/20/25/30 m², hướng Tây, tầng áp mái, missing/invalid area, intent/entity/category/BTU normalization. Integration kiểm tra giá và stock hiện thời, follow-up context, sizing/recommendation, guest không persistence, authenticated persistence, ownership và sync.

Kết quả cuối: 27/27 test đạt; API/frontend typecheck đạt; Docker production build đạt; smoke test localhost trả price intent đúng và sizing 20 m² tầng áp mái hướng Tây = 18.000 BTU, heat load HIGH, một sản phẩm catalog phù hợp.

## Recommended Phase 2

PostgreSQL full-text search/alias admin, normalized promotion relations, recommendation snapshot persistence, washing-machine/refrigerator/TV skills, optional pgvector cho tài liệu dài, cart actions, evaluation dashboard và conversation analytics.
