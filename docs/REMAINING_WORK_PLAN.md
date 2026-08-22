# Kế hoạch hoàn thiện Điện Máy 365 sau Phase 10

Ngày audit: 2026-08-22  
Cập nhật triển khai: Phase 11 hoàn thành ngày 2026-08-22.

## 1. Kết luận nhanh

Hệ thống đã có nền tảng commerce end-to-end: Laravel 11 + Inertia SSR + React 19, catalog/SEO, auth/account, cart/wishlist, pricing, checkout/order transaction, provider abstraction và Filament 4. Baseline gần nhất đã ghi nhận 53 tests/469 assertions đạt, production client/SSR build đạt và raw HTML SEO đã được kiểm tra.

Ứng dụng **chưa nên launch production**. Các blocker chính là:

1. Baseline Phase 11 đã được chuẩn bị trên nhánh `codex/phase-11-stabilization`; cần review/merge theo quy trình của dự án trước release.
2. Laravel 11 hiện nằm trong dải bị ảnh hưởng bởi các security advisory năm 2026; cần quyết định nâng Laravel hoặc áp dụng biện pháp giảm thiểu có kiểm chứng.
3. Filament mới có quyền truy cập admin tổng quát, chưa có least privilege, audit log và policy/action an toàn cho payment, shipment, installation, review, user và nội dung SEO.
4. Chưa có production media pipeline, mail provider, backup/restore, monitoring/alerting, CI/CD và production deployment topology.
5. Một số storefront feature vẫn thiếu: compare, trang khuyến mãi, customer review/moderation hoàn chỉnh; visual parity vẫn cần UAT có baseline.
6. Payment/shipping hiện là manual adapters; chưa phải tích hợp VNPay/MoMo/GHN/GHTK thật.

## 2. Trạng thái theo phân hệ

| Phân hệ | Trạng thái | Phần còn thiếu |
|---|---|---|
| SSR/SEO public | Đã có | Production-domain QA, sitemap scale/cache, Search Console, dữ liệu/ảnh thật, Merchant feed |
| Catalog/search/news | Đã có lõi | Content UAT, taxonomy/subcategory nếu nghiệp vụ cần, link khuyến mãi |
| Auth/account/address | Đã có | Production mail, email verification delivery, MFA admin, session/cookie hardening |
| Cart/wishlist/pricing | Đã có | Load/concurrency test trên MySQL gần production, scheduled cleanup |
| Checkout/orders | Đã có manual flow | Provider thật, reconciliation, notification thật, operational runbook |
| Compare | Đã hoàn thiện Phase 11 | localStorage, chống trùng, giới hạn 4, tray toàn cục và trang so sánh responsive/noindex |
| Reviews | Một phần | Customer submit, verified purchase, moderation workflow, approved-only aggregate/JSON-LD |
| Promotions | Đã có landing public | `/khuyen-mai` lấy promotion và sản phẩm đủ điều kiện từ database, SSR/SEO/Breadcrumb JSON-LD |
| Filament | Có 16 resources/dashboard | Granular roles/policies, audit log, domain actions, media hardening |
| Media | Prototype | Object storage/CDN, validation, variants, optimization, orphan cleanup, ảnh SKU thật |
| Jobs/scheduler | Có worker container | Chưa có lịch nghiệp vụ/cleanup/feed/reconciliation/alerts |
| Observability | Tối thiểu | Error tracking, structured logs, queue/slow-query alerts, business metrics |
| Delivery | Chưa production-ready | CI/CD, immutable image, reverse proxy/TLS, zero-downtime deploy, rollback, backup/PITR |

## 3. Các rủi ro cần xử lý trước tiên

### P0 — Chặn mọi release

- Tạo Git baseline được review; loại trừ `.env`, secrets, runtime data, build artifacts không cần commit. Tag mốc Phase 10 sau khi test xanh.
- Chốt chiến lược framework security. `composer.json` đang khóa `laravel/framework: ^11.0`; không đưa production lên Internet khi dependency audit còn advisory chưa xử lý.
- Chạy lại full quality gate trên môi trường tái lập: MySQL 8 migrate fresh/seed, PHPUnit, Pint, TypeScript, client build, SSR build và raw HTTP assertions.
- Thiết lập backup, kiểm thử restore và rollback trước migration production.

### P1 — Bắt buộc trước launch

- Phân quyền admin theo vai trò và policy; ngăn sửa trực tiếp total/status nghiệp vụ hoặc hard-delete dữ liệu SEO/order.
- Cấu hình production mail, Redis session/cache/queue, object storage, HTTPS/cookie/trusted proxy và webhook secrets.
- Error monitoring, failed-job/queue alert, health/readiness và structured logging có request/order ID.
- CI/CD với dependency/security scan, automated test/build, migration safety, smoke test và rollback.
- UAT storefront desktop/mobile, accessibility cơ bản, SEO raw HTML và checkout concurrency/idempotency.

### P2 — Hoàn thiện sản phẩm

- Compare tối đa 4 sản phẩm, trang/drawer dùng dữ liệu hiện tại và không đổi visual language.
- Promotion landing/listing nếu menu “Khuyến mãi” tiếp tục tồn tại.
- Customer reviews: submit, ownership/rate limit, verified purchase, moderation và aggregate approved-only.
- Media optimization, ảnh thật, GTIN/MPN, alt text và metadata thật.
- Merchant Center feed sau khi catalog identifiers/chính sách giao hàng/đổi trả đầy đủ.

### P3 — Sau launch có kiểm soát

- Payment/shipping provider thương mại, SMS, advanced recommendation, abandoned-cart campaign.
- Tách sitemap index khi URL lớn, search analytics, A/B testing và nâng cấp search engine khi MySQL search không đáp ứng tải.

## 4. Kế hoạch thực hiện đề xuất

### Phase 11 — Stabilization và feature parity — HOÀN THÀNH

1. Tạo Git baseline/branching/release convention và cập nhật tài liệu hiện trạng duy nhất.
2. Khởi động Docker; chạy MySQL `migrate:fresh --seed`, full test, Pint, TypeScript, client/SSR build.
3. Lập visual baseline từ UI prototype cho home/category/product/cart/checkout/account/news ở desktop và mobile.
4. Hoàn thiện compare client-side, giới hạn 4, chống trùng và giữ trạng thái localStorage.
5. Chốt xử lý menu khuyến mãi: tạo route/page thật hoặc bỏ mục khỏi navigation sau khi business duyệt.
6. Rà dữ liệu seed theo từng bảng; tách demo/dev seed khỏi production seed, không đưa fake review/rating vào production.

Kết quả nghiệm thu kỹ thuật:

- MySQL 8 chạy migration sạch và seed thành công; dữ liệu development hiện có 35 sản phẩm cùng catalog/content/commerce liên quan.
- 56 tests, 516 assertions đạt trên SQLite in-memory cô lập; Pint, TypeScript, client build và Inertia SSR build đều đạt.
- Compare tối đa 4 sản phẩm hoạt động qua localStorage, có tray và trang `/so-sanh` responsive/noindex.
- Landing `/khuyen-mai` dùng promotion scope thật theo product/category/brand; navigation đã liên kết tới trang thật.
- Raw HTTP xác nhận product H1, metadata, canonical, Product/Breadcrumb JSON-LD nằm trong initial SSR HTML.
- Browser QA desktop 1280px và mobile 390×844 đạt cho home, category, compare và promotions; không tràn ngang, không có console warning/error.
- Docker app/SSR/MySQL/Redis/queue/scheduler hoạt động. Development server dùng PHP router trực tiếp để giữ biến environment runtime khi image chứa file `.env` rỗng phục vụ test; production vẫn phải dùng PHP-FPM + reverse proxy.

Phần còn lại ngoài Phase 11: business UAT/ký duyệt visual chính thức và security framework decision trước public launch.

### Phase 12 — Filament production hardening (4–6 ngày)

1. Thiết kế roles/permissions tối thiểu: super-admin, catalog-editor, content-editor, order-operator, support/read-only.
2. Thêm policy cho từng resource và test truy cập/action; cân nhắc Filament Shield hoặc policy nội bộ.
3. Payment/shipment/installation/order chỉ thay đổi qua domain action/transition service; không generic edit/delete.
4. Review dùng approve/reject workflow; user không tự xóa/nâng quyền; product/category/brand/article không force-delete tùy tiện.
5. Thêm audit log cho login admin, CRUD nhạy cảm, status transitions, promotions/coupons và settings.
6. Hoàn thiện validation SEO, slug uniqueness, duplicate canonical warning và preview.

Nghiệm thu: permission matrix test xanh; mọi thay đổi nhạy cảm truy vết được; không có đường tắt phá invariants commerce.

### Phase 13 — Media, reviews, settings và jobs (4–6 ngày)

1. Chọn S3-compatible storage/CDN; cấu hình disk/directory/visibility, MIME/size/dimension validation.
2. Tạo WebP/AVIF và responsive variants; queue image processing; dọn orphan; quy trình alt text.
3. Thay placeholder bằng ảnh sản phẩm có quyền sử dụng và ánh xạ đúng SKU.
4. Hoàn thiện customer review, verified purchase, moderation, approved-only aggregate và structured data chính xác.
5. Cache settings/catalog facets/sitemap có versioned invalidation.
6. Scheduler: promotion expiry, abandoned cart cleanup, failed provider reconciliation, sitemap/feed refresh, low-stock alert.
7. Cấu hình mail provider và test reset password/order notification thực tế.

Nghiệm thu: upload an toàn; ảnh responsive hoạt động; job retry/failure quan sát được; email thật đến inbox test; không có fake rating trong HTML/JSON-LD.

### Phase 14 — Security, observability và performance (4–6 ngày)

1. Thực hiện framework decision: ưu tiên nâng lên Laravel release còn được vá và kiểm tra Filament/Inertia compatibility; nếu buộc giữ Laravel 11 phải có risk acceptance và compensating controls cụ thể.
2. Chạy `composer audit`, `npm audit`/scanner tương đương trong CI; secret scan và SBOM/dependency inventory.
3. CSP, HSTS, frame/content-type/referrer policies; secure/session cookies; trusted proxies; upload and webhook hardening; admin MFA.
4. Sentry/OpenTelemetry hoặc giải pháp tương đương; log correlation; alert 5xx, failed jobs, queue lag, webhook failures, payment mismatch, low stock.
5. MySQL `EXPLAIN`, query budget/N+1 checks và realistic-volume seed; cache strategy không cache account/cart HTML.
6. Load test home/catalog/search/cart/checkout và contention; đặt SLO/performance budgets/Core Web Vitals budgets.
7. Automated accessibility and visual regression smoke tests.

Nghiệm thu: dependency audit không còn blocker chưa chấp nhận; security headers/cookies được test; load/SLO đạt; alert được diễn tập.

### Phase 15 — Deployment, UAT và go-live (4–6 ngày)

1. Production stack: reverse proxy/TLS, PHP-FPM, MySQL 8, Redis, queue workers, scheduler, Inertia SSR, object storage/CDN.
2. CI/CD: locked install → lint/static checks → tests → client/SSR build → immutable artifact/image → staging → approval → production.
3. Migration strategy zero/minimal downtime; backup/PITR; restore drill; application rollback và forward-fix DB policy.
4. Production-like staging smoke: homepage, category, product raw SSR, search, auth, cart, coupon, checkout, order, admin, sitemap, robots, 404, webhook fail-closed.
5. Search Console/Bing verification, analytics/consent theo chính sách, canonical/sitemap production domain.
6. Runbook incident/payment mismatch/order support/queue failure; ownership và on-call contacts.
7. UAT business + SEO + responsive; go/no-go checklist và post-launch monitoring 24–72 giờ.

Nghiệm thu: restore đã diễn tập; deploy/rollback diễn tập; production smoke xanh; stakeholder ký UAT; dashboard/alerts hoạt động.

## 5. Quyết định business cần chốt

1. Có giữ trang/menu Khuyến mãi và scope nội dung của trang hay không.
2. Payment: COD/chuyển khoản/VNPay/MoMo/ZaloPay; shipping: nội bộ/GHN/GHTK.
3. Mail/SMS provider, production domain, sender identity và chính sách email verification.
4. S3/CDN/image provider và quyền sử dụng ảnh sản phẩm.
5. Vai trò nhân viên thực tế và ai được duyệt giá, coupon, review, trạng thái đơn.
6. Chính sách review, đổi trả, vận chuyển, bảo hành và thông tin pháp nhân phục vụ SEO/Merchant Center.
7. Quyết định nâng Laravel khỏi version 11 trước launch.

## 6. Ước lượng

| Phần | Công sức |
|---|---:|
| Phase 11 | 3–5 ngày |
| Phase 12 | 4–6 ngày |
| Phase 13 | 4–6 ngày |
| Phase 14 | 4–6 ngày |
| Phase 15 | 4–6 ngày |
| Tổng | **19–29 ngày công** |

Ước lượng dành cho một senior full-stack, không tính thời gian chờ credentials/provider, nhập content/ảnh thật quy mô lớn hoặc xử lý phát sinh từ việc nâng major Laravel. Có thể song song hóa media/content với CI/observability sau khi Phase 11 tạo baseline ổn định.

## 7. Thứ tự bắt đầu

Slice tiếp theo là **Phase 12: Filament production hardening**, nhưng framework security decision phải được xử lý trước khi đưa hệ thống lên Internet. Visual UAT chính thức vẫn cần stakeholder ký duyệt dù smoke test desktop/mobile đã đạt.
