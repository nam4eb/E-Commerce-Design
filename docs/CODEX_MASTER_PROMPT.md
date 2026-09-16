# CODEX MASTER PROMPT — APPLY AI SALES TRAINING DATASET TO `E-commerce-design`

Bạn đang làm việc trực tiếp trong repository `E-commerce-design`, một website E-commerce điện máy/điện lạnh dùng Next.js backend.

Trong workspace D:\Project\E-Commerce-Design\docs có bộ dữ liệu:

- `ai_chatbot_training_dataset.jsonl`
- `ai_chatbot_training_dataset.csv`
- `README.md`

Mục tiêu KHÔNG phải fine-tune product catalog vào LLM.

Mục tiêu là biến chatbot hiện tại thành **AI Product Sales Assistant** có hành vi giống nhân viên tư vấn điện máy: hiểu đúng intent, trích xuất đúng nhu cầu, chạy skill nghiệp vụ ở backend, truy xuất đúng product/price/stock/spec từ database và chỉ dùng LLM nhỏ để hiểu/ngôn ngữ hóa câu trả lời.

---

## 0. NGUYÊN TẮC BẤT BIẾN

Kiến trúc phải tuân theo:

```text
LLM
= hiểu ngôn ngữ + structured extraction + diễn đạt ngắn gọn

SKILLS
= logic tư vấn deterministic bằng TypeScript

BACKEND SERVICES
= search / price / stock / promotion / warranty / ranking

DATABASE
= source of truth
```

Tuyệt đối không:

- fine-tune catalog sản phẩm;
- nhét toàn bộ catalog hoặc toàn bộ training dataset vào prompt runtime;
- cho LLM bịa giá, tồn kho, khuyến mại, best seller, thông số;
- cho LLM tự tính BTU/dung tích/công suất thay backend skill;
- cho LLM chạy raw SQL;
- dùng reasoning model đắt tiền mặc định;
- đổi kiến trúc backend hiện có nếu không cần.

---

# PHASE 1 — AUDIT CHATBOT HIỆN TẠI

Trước khi sửa code:

1. Scan project.
2. Tìm:
   - endpoint chatbot hiện tại;
   - Vercel AI SDK/OpenAI integration;
   - current system prompt;
   - intent detection hiện tại;
   - product search hiện tại;
   - database/ORM;
   - Product/Variant/Category/Brand schema;
   - price service;
   - inventory service;
   - promotion service;
   - order/sales metrics;
   - authentication;
   - chat UI/state;
   - persistence.
3. Reproduce hoặc trace hai lỗi hành vi đã biết:

### Case A

Input:

`Phòng ngủ 20m² dùng điều hòa bao nhiêu BTU?`

Behavior sai đã quan sát:
chatbot bỏ qua sizing skill và search catalog trực tiếp, thậm chí trả sản phẩm 1HP.

Behavior đúng:
`AIR_CONDITIONER_SIZING -> deterministic calculation -> commercial capacity -> product search`.

### Case B

Input:

`top những điều hòa midea bán chạy nhất`

Behavior sai đã quan sát:
fallback chung kiểu “Tôi hỗ trợ tìm sản phẩm...”.

Behavior đúng:
`BEST_SELLER -> brand=Midea + category=AIR_CONDITIONER -> verified sales ranking`.

Nếu không có sales metric, chatbot phải nói không thể xác nhận “bán chạy nhất”, không được đoán.

Tạo:

`docs/ai-chatbot-training-gap-analysis.md`

bao gồm root cause của hai case này.

---

# PHASE 2 — IMPORT DATASET

Đặt dataset vào vị trí phù hợp, ví dụ:

```text
data/ai-training/
  ai_chatbot_training_dataset.jsonl
  ai_chatbot_training_dataset.csv
```

Hoặc giữ path hiện tại nếu repo có convention khác.

Tạo loader TypeScript chỉ dùng cho:

- evaluation;
- tests;
- development tooling.

KHÔNG load toàn bộ dataset cho mỗi chat request.

---

# PHASE 3 — TẠO INTENT TAXONOMY CHUẨN

Sinh type/enum từ các intent có trong JSONL.

Ví dụ:

```ts
export type ChatIntent =
  | "GREETING"
  | "PRODUCT_PRICE"
  | "PRODUCT_STOCK"
  | "BEST_SELLER"
  | "AIR_CONDITIONER_SIZING"
  | ...
```

Không hard-code một danh sách khác với dataset.

Nếu project dùng Zod, tạo schema.

Intent result tối thiểu:

```ts
interface IntentResult {
  intent: ChatIntent;
  confidence: number;
  entities: Record<string, unknown>;
  skill?: string;
}
```

---

# PHASE 4 — NORMALIZATION

Tạo normalization layer cho tiếng Việt bán hàng:

- không dấu;
- viết tắt;
- typo;
- đơn vị;
- aliases.

Ví dụ:

```text
điều hòa / máy lạnh / dieu hoa / may lanh
-> AIR_CONDITIONER

12k / 12000 / 12.000 BTU / 1.5HP / 1,5 ngựa
-> normalized capacity representation

bn / bao nhieu
-> bao nhiêu

ko / k / không
-> không
```

Không normalize bằng cách phá model/SKU.

Ví dụ:

`FTKB35`, `XPU12XKH-8`, `FV1412S3BA`
phải giữ được.

Tạo unit tests từ các case `style=no_accent` và `style=slang`.

---

# PHASE 5 — INTENT RESOLVER

Không dùng keyword-only classifier.

Dùng hybrid:

```text
deterministic high-confidence rules
+
small LLM structured classification khi cần
```

Ví dụ rules mạnh:

```text
"giá", "bao nhiêu tiền"
+ resolvable product
-> PRODUCT_PRICE

"còn hàng", "còn kho"
-> PRODUCT_STOCK

"bán chạy", "best seller", "khách mua nhiều"
-> BEST_SELLER

room area + AC + capacity question
-> AIR_CONDITIONER_SIZING
```

Nhưng phải tránh keyword collision.

Bộ contrast sau phải phân loại khác nhau:

```text
Điều hòa Midea nào phù hợp nếu ưu tiên chạy êm?
-> PRODUCT_ADVICE

Điều hòa Midea nào bán chạy nhất?
-> BEST_SELLER

Điều hòa Midea nào rẻ nhất?
-> PRICE_RANKING

Điều hòa Midea nào tiết kiệm điện nhất?
-> FEATURE_RANKING

Điều hòa Midea nào đang còn hàng?
-> PRODUCT_STOCK

Cho xem điều hòa Midea
-> BRAND_SEARCH
```

Nếu dùng LLM classifier, chỉ gửi:
- user question;
- short context;
- compact intent definitions;
- JSON schema.

Không gửi product catalog.

---

# PHASE 6 — ENTITY EXTRACTION

Tạo structured extraction cho:

```ts
interface CommerceEntities {
  brand?: string;
  category?: string;
  productName?: string;
  model?: string;
  sku?: string;

  minPrice?: number;
  maxPrice?: number;

  areaM2?: number;
  dimensions?: {
    width?: number;
    length?: number;
    height?: number;
  };

  capacityBTU?: number;
  horsepower?: number;

  people?: number;
  roomType?: string;
  direction?: string;
  topFloor?: boolean;
  largeGlassArea?: boolean;

  viewingDistanceM?: number;

  inverter?: boolean;

  requiredFeatures?: string[];
  excludedFeatures?: string[];
  excludedBrands?: string[];

  quantity?: number;

  timeWindow?: string;

  keywords?: string[];
}
```

Merge entities từ:
- current question;
- short client context.

Correction intent phải overwrite constraint cũ.

---

# PHASE 7 — SKILL ROUTER

Tạo registry:

```ts
interface AISkill<I, O> {
  name: string;
  execute(input: I): Promise<O> | O;
}
```

Ví dụ:

```text
AIR_CONDITIONER_SIZING
WASHING_MACHINE_SIZING
REFRIGERATOR_SIZING
TV_SIZE_ADVISOR
WATER_HEATER_SIZING
AIR_PURIFIER_SIZING
ENERGY_COST_ESTIMATOR
```

Không bắt buộc implement tất cả hoàn chỉnh ngay nếu product schema chưa đủ, nhưng architecture + tests phải sẵn sàng.

Ưu tiên hoàn thiện `AIR_CONDITIONER_SIZING` trước.

---

# PHASE 8 — FIX AIR-CONDITIONER SIZING

Skill phải là deterministic TypeScript.

Ví dụ schema:

```ts
interface AirConditionerSizingInput {
  areaM2: number;
  ceilingHeight?: number;
  roomType?: string;
  direction?: string;
  topFloor?: boolean;
  people?: number;
  largeGlassArea?: boolean;
  heatSources?: boolean;
}

interface AirConditionerSizingOutput {
  estimatedBTU: number;
  recommendedCommercialBTU: number;
  recommendedHP?: number;
  heatLoad: "LOW" | "NORMAL" | "HIGH";
  assumptions: string[];
  missingImportantFactors: string[];
}
```

Dùng rule configuration riêng, không rải magic number.

Baseline có thể bắt đầu từ rule business hiện tại, ví dụ khoảng `600 BTU/m²` cho điều kiện bình thường, nhưng phải configurable.

Commercial capacities:

```text
9000
12000
18000
24000
...
```

Case bắt buộc:

`Phòng ngủ 20m² dùng điều hòa bao nhiêu BTU?`

Phải:
1. extract 20m² + bedroom;
2. run sizing;
3. normal condition -> around 12,000 BTU commercial class;
4. sau đó mới search product;
5. không trả máy 9,000 BTU chỉ vì keyword match.

Case:

`Phòng 20m2 tầng áp mái hướng Tây`

phải tăng heat load theo rule và cân nhắc commercial capacity cao hơn.

LLM KHÔNG tự tính BTU.

---

# PHASE 9 — PRODUCT RETRIEVAL

Tạo/reuse service:

```ts
interface ProductSearchQuery {
  categoryId?: string;
  brandId?: string;

  model?: string;
  sku?: string;

  minPrice?: number;
  maxPrice?: number;

  capacityBTU?: number;
  capacityTolerance?: number;

  inverter?: boolean;

  requiredFeatures?: string[];
  excludedFeatures?: string[];
  excludedBrands?: string[];

  inStock?: boolean;

  limit?: number;
}
```

Search priority:

```text
exact SKU
exact model
normalized model
aliases
structured filters
full-text/keyword
semantic search only if later justified
```

---

# PHASE 10 — BEST SELLER / RANKING

Tạo ranking service.

Phải xác định system hiện có metric nào:

- `unitsSold30d`
- `orders30d`
- completed order item count;
- `salesRank`;
- analytics event;
- hoặc metric khác.

Không được dùng:
- random order;
- price;
- stock;
- prompt knowledge;
- model memory

để gọi là “bán chạy”.

API/service ví dụ:

```ts
getBestSellers({
  categoryId,
  brandId,
  timeWindow: "30d",
  limit: 5
})
```

Nếu chưa có verified metric:

```ts
return {
  available: false,
  reason: "NO_VERIFIED_SALES_METRIC"
}
```

Chatbot phải trả limitation rõ ràng.

Đây là regression case bắt buộc:

`top những điều hòa midea bán chạy nhất`

---

# PHASE 11 — RESPONSE ENGINE

Tạo response strategy dựa trên dataset:

### Direct template, không LLM

Dùng cho:
- price;
- stock;
- SKU;
- simple promotion;
- exact deterministic result.

### Small LLM

Dùng cho:
- short product explanation;
- advice explanation;
- comparison summary;
- FAQ.

### Skill + retrieval + optional LLM

Dùng cho:
- sizing;
- recommendation;
- energy estimate.

LLM phải nhận verified context, ví dụ:

```json
{
  "question": "...",
  "intent": "...",
  "skillResult": {...},
  "verifiedProducts": [...],
  "verifiedFacts": [...]
}
```

System rule:

```text
Answer only from verified context.
Never invent commerce facts.
If data is unavailable, say so.
Keep answers concise and helpful.
```

---

# PHASE 12 — SALES-ASSISTANT RESPONSE BEHAVIOR

Thay fallback kỹ thuật:

`Tôi hỗ trợ tìm sản phẩm, kiểm tra giá/tồn kho...`

bằng behavior giống nhân viên bán hàng.

Preferred response order:

1. trả lời trực tiếp;
2. giải thích 1-3 câu;
3. nếu cần, show 2-5 sản phẩm thật;
4. chỉ hỏi thêm **1 câu** nếu câu đó tăng đáng kể độ chính xác.

Ví dụ incomplete AC query:

`Tư vấn điều hòa`

Hỏi:

`Phòng cần lắp khoảng bao nhiêu m²?`

Không hỏi đồng thời:
- diện tích;
- ngân sách;
- hướng;
- số người;
- hãng;
- tầng;
- kính...

---

# PHASE 13 — SHORT CONTEXT ONLY

Giữ architecture hiện tại:

Guest messages ở browser RAM.

Request chỉ gửi:

```ts
{
  message,
  context?: {
    lastProductId?,
    lastCategoryId?,
    lastIntent?,
    constraints?
  }
}
```

Không gửi toàn bộ lịch sử cho mỗi request.

Follow-up:

`Còn hàng không?`

+ `lastProductId`

-> PRODUCT_STOCK.

Correction:

`Không, tôi muốn 18000 BTU cơ`

-> update previous capacity constraint.

---

# PHASE 14 — PERSISTENCE

Giữ yêu cầu:

- guest: không save conversation DB;
- authenticated: save;
- auth phải check server-side;
- optional guest->login sync.

Dataset/evaluation không được làm thay đổi privacy behavior này.

---

# PHASE 15 — BUILD EVALUATION HARNESS

Đây là phần bắt buộc.

Tạo script, ví dụ:

```text
scripts/eval-ai-chatbot.ts
```

Nó đọc `jsonl` theo split.

Phải có ít nhất 3 level eval:

## A. Intent accuracy

Compare:
`predicted.intent === expected.intent`

## B. Skill routing accuracy

Compare:
`predicted.skill === expected.skill`

## C. Entity checks

Với entity literal:
- area;
- brand;
- budget;
- people;
- direction...

kiểm tra value.

Với instruction như `"extract"`:
chỉ kiểm tra field tồn tại khi applicable.

## D. Behavioral evaluator

Không bắt exact natural-language output.

Kiểm:
- backend service được gọi đúng;
- forbidden service không được gọi;
- ranking không được bịa;
- price/stock lấy từ backend;
- sizing chạy trước product search;
- no-result flow không silently violate constraints.

Dùng mocks/fakes cho database/services trong unit tests.

---

# PHASE 16 — TEST SPLITS

Tuân thủ:

- `train`: dùng để thiết kế rules/few-shot examples;
- `validation`: tune threshold;
- `test`: regression holdout.

Không đọc từng câu `test` rồi hard-code special case.

Các paraphrase chung `family_id` đã được giữ cùng split để giảm leakage.

---

# PHASE 17 — METRICS

Eval output ví dụ:

```text
Intent accuracy: 96.8%
Skill routing: 98.1%
Critical commerce intents: 99.5%
Entity extraction: 95.2%
Forbidden hallucination violations: 0
```

Đặc biệt report riêng:

```text
PRODUCT_PRICE
PRODUCT_STOCK
BEST_SELLER
AIR_CONDITIONER_SIZING
MULTI_CONSTRAINT_SEARCH
FOLLOW_UP_CONTEXT
```

Tạo JSON report và console summary.

---

# PHASE 18 — TARGETS

Trước khi coi implementation hoàn thành:

- critical intent accuracy >= 98% trên validation/test phù hợp;
- overall intent accuracy mục tiêu >= 95%;
- `PRODUCT_PRICE`/`PRODUCT_STOCK`: không được dùng LLM memory để tạo factual answer;
- `BEST_SELLER`: 0 false best-seller claim khi thiếu ranking data;
- `AIR_CONDITIONER_SIZING`: 100% test cases phải run skill trước product retrieval;
- không có guest chat persistence regression.

Nếu chưa đạt, cải thiện normalization/rules/schema/classifier rồi chạy lại.

Không “fix” bằng cách thêm nguyên câu test vào if/else.

---

# PHASE 19 — ADD REGRESSION DATA FROM PRODUCTION

Tạo workflow/documentation:

Khi chatbot trả lời sai ngoài production:

1. anonymize question;
2. add canonical record vào JSONL;
3. tạo family/paraphrases nếu cần;
4. add expected intent/entities/action;
5. viết regression test;
6. fix;
7. run full eval.

Dataset phải trở thành living asset của dự án.

---

# PHASE 20 — DOCUMENTATION

Tạo:

`docs/ai-chatbot-training.md`

Bao gồm:

- dataset schema;
- intent taxonomy;
- normalization;
- classifier;
- entity extraction;
- skills;
- retrieval;
- ranking;
- response engine;
- evaluation;
- cách thêm intent;
- cách thêm skill;
- cách thêm regression case;
- cách chạy tests/eval.

---

# DEFINITION OF DONE

Hai lỗi ban đầu phải được fix.

### Required Test 1

Input:
`Phòng ngủ 20m² dùng điều hòa bao nhiêu BTU?`

Expected pipeline:

```text
AIR_CONDITIONER_SIZING
-> area=20
-> deterministic sizing skill
-> ~12,000 BTU class under normal configured rule
-> product search around that capacity
-> verified product cards
```

### Required Test 2

Input:
`top những điều hòa midea bán chạy nhất`

Expected pipeline:

```text
BEST_SELLER
-> brand=Midea
-> category=AIR_CONDITIONER
-> verified ranking metric
-> ranked products
```

If no metric:

```text
transparent "cannot verify best-seller ranking"
```

NOT generic fallback.
NOT invented ranking.

### Required Test 3

Input:
`Điều hòa Midea nào rẻ nhất?`

Must NOT route to BEST_SELLER.

### Required Test 4

Input:
`Điều hòa Midea nào tiết kiệm điện nhất?`

Must NOT route to BEST_SELLER or PRICE_RANKING.

### Required Test 5

Input:
`Còn hàng không?`

with valid `lastProductId`
-> PRODUCT_STOCK.

---

# FINAL RULE

Không xây một ChatGPT tổng quát.

Hãy xây:

```text
CUSTOMER LANGUAGE
       ↓
INTENT + ENTITIES
       ↓
DETERMINISTIC SKILL
       ↓
VERIFIED BACKEND DATA
       ↓
SHORT SALES RESPONSE
```

Sau khi hoàn thành:

1. run lint;
2. typecheck;
3. tests;
4. production build;
5. full dataset evaluation;
6. create:

`docs/ai-chatbot-training-implementation-report.md`

Report phải ghi:
- files changed;
- schema changes;
- current intent accuracy;
- skill accuracy;
- failed test cases;
- remaining limitations;
- recommended next skills.

Bắt đầu bằng audit repository và hai regression cases đã nêu, không bắt đầu bằng sửa UI.
