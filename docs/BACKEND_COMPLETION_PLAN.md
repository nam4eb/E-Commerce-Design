# Kế hoạch hoàn thiện backend Điện Máy 365

Ngày lập: 2026-08-21  
Kiến trúc cố định: Laravel 11 + PHP 8.3+ + MySQL 8 + Inertia.js SSR + React 19 + Filament 4.

## 1. Phạm vi và nguyên tắc

- Giữ nguyên React storefront và ngôn ngữ thiết kế hiện có; chỉ thay đổi routing, props, state và integration khi cần.
- Trang public có khả năng index dùng Laravel Controller → Eloquent → Inertia SSR, không tạo REST API trùng lặp.
- API `/api/v1/*` chỉ dành cho hành vi bất đồng bộ thực sự như gợi ý tìm kiếm, cart mutation và checkout validation.
- Giá, tồn kho, giảm giá, phí vận chuyển và phí lắp đặt luôn do backend tính lại.
- Mỗi vertical slice phải có migration/model, authorization, controller/service, UI integration, feature test, SSR/HTTP test và browser smoke test trước khi chuyển slice.
- Không triển khai payment gateway hoặc shipping provider thật trước khi stakeholder chọn nhà cung cấp.

## 2. Baseline hiện tại

Đã hoàn thành:

- Laravel/Inertia React foundation, Vite client build và SSR renderer.
- Schema nền cho catalog, content, customer và commerce.
- Product detail và category `/dieu-hoa` production slice.
- Brand/article route ở mức skeleton.
- Product/Breadcrumb/Collection/Organization JSON-LD, metadata, canonical.
- `sitemap.xml`, `robots.txt`, legacy product redirect và HTTP 404.
- Catalog seed mẫu; Phase 5 nâng tổng kiểm thử lên 26 test với 311 assertions.
- Docker development stack: PHP 8.3, MySQL 8, Redis 7, app, queue, scheduler và Inertia SSR Node renderer.
- Authentication, account/profile/password và address ownership đã hoàn thành.

Còn thiếu hoặc chưa production-ready:

- Browser smoke test cuối cho Phase 5 và production hardening cookie/mail vẫn cần cấu hình theo domain thật.
- Search, brand, article, các category còn lại.
- Cart, wishlist, promotion/coupon, checkout, orders, payment/shipment/installation.
- Filament 4, media workflow, queue/scheduler, observability, security hardening và deployment pipeline.

## 3. Thứ tự triển khai

### Phase 3 — Củng cố database và domain model (2–3 ngày)

**Trạng thái 2026-08-21:** phần code/schema đã hoàn thành và được xác minh bằng SQLite; nghiệm thu MySQL 8 còn chờ môi trường có MySQL client/service và credentials.

Mục tiêu: biến schema nền hiện có thành schema production trước khi phát sinh dữ liệu thật.

Công việc:

1. Chạy `migrate:fresh --seed` trên MySQL 8 thật; sửa khác biệt SQLite/MySQL về JSON, index, decimal, foreign key và unique nullable.
2. Tách các migration commerce đang viết cô đọng thành migration dễ bảo trì nếu dự án chưa có dữ liệu production.
3. Bổ sung model và relationship cho `Address`, `Cart`, `CartItem`, `Wishlist`, `Review`, `Order`, `OrderItem`, `Payment`, `Shipment`, `Installation`, `Promotion`, `Coupon`, `Setting`.
4. Dùng PHP enum cho trạng thái sản phẩm, đơn hàng, payment, shipment, installation và article; thêm cast tương ứng.
5. Rà soát schema:
   - Order lưu snapshot người nhận, địa chỉ, SKU, tên, đơn giá, giảm giá và thuế/phí tại thời điểm mua.
   - Cart item có unique theo cart/product/installation option phù hợp.
   - Coupon có giới hạn tổng, giới hạn mỗi user, thời gian hiệu lực và maximum discount nếu cần.
   - Promotion có phạm vi áp dụng qua pivot product/category/brand.
   - Review cho guest cần reviewer identity; không dùng unique nullable `product_id,user_id` làm quy tắc duy nhất.
   - Thêm inventory movement/reservation nếu checkout cần giữ tồn kho trong thời gian thanh toán.
6. Bổ sung factory/seeder cho mọi domain chính và dữ liệu biên.

File dự kiến:

- `app/Models/*.php`, `app/Enums/*.php`
- migration bổ sung trong `database/migrations/`
- `database/factories/*Factory.php`, `database/seeders/*Seeder.php`
- `tests/Feature/Database/*Test.php`

Tiêu chí hoàn thành:

- MySQL 8 migrate/rollback/fresh/seed đều thành công.
- Foreign key, unique constraint, decimal và status transition có test.
- Không tiếp tục nếu schema order/cart chưa chốt.

### Phase 4 — Hoàn thiện public catalog, brand, article và search (3–4 ngày)

**Trạng thái 2026-08-21:** hoàn thành và đã kiểm thử tự động, raw SSR và trình duyệt desktop/mobile.

Mục tiêu: hoàn thiện toàn bộ backend đọc dữ liệu public và SEO trước commerce.

Công việc:

1. Tổng quát hóa `CategoryController`, không hard-code riêng điều hòa; route taxonomy vẫn phải rõ ràng và không trùng canonical.
2. Bổ sung category routes: `/tu-lanh`, `/may-giat`, `/tivi`, `/do-gia-dung`, hoặc mapping theo taxonomy dữ liệu đã duyệt.
3. Hoàn thiện `/thuong-hieu/{brand}` với filter, sort, pagination, metadata, breadcrumb và Collection JSON-LD.
4. Thêm `/tin-tuc` listing và hoàn thiện `/tin-tuc/{article}` với Article JSON-LD, author, published/modified date, related products.
5. Thêm search result page có policy index/noindex; endpoint duy nhất `GET /api/v1/search/suggestions` có throttle, giới hạn kết quả và escaped query.
6. Trích query logic thành `CatalogQuery`/filter objects dùng chung, tránh controller phình to.
7. Cập nhật sitemap index nếu số URL lớn; tách product/category/brand/article sitemap.
8. Test canonical, filter parameters, pagination, 404, soft-deleted/draft records và query count/N+1.

Tiêu chí hoàn thành:

- Mọi product/category/brand/article active có một canonical URL duy nhất và SSR HTML đầy đủ.
- Draft/inactive/future content trả 404 và không vào sitemap.
- Search suggestion đạt giới hạn truy vấn và không để lộ draft product.

### Phase 5 — Authentication, account và addresses (3–4 ngày)

**Trạng thái 2026-08-21:** hoàn thành phần triển khai và kiểm thử tự động; Docker MySQL 8 migrate/seed đã đạt.

Mục tiêu: session authentication phù hợp kiến trúc same-origin Inertia.

Công việc:

1. Cài flow login, register, logout, forgot/reset password, email verification và rate limiting bằng Laravel session auth.
2. Không dùng Sanctum cho trang Inertia same-origin nếu không có client ngoài; chỉ thêm Sanctum khi mobile/external API thực sự cần token.
3. Tạo Form Request, action/service và policy cho profile, password và address CRUD.
4. Account pages lấy user/orders/wishlist/address bằng Inertia props; dùng partial reload cho tab nặng.
5. Bổ sung admin/customer role separation; không dựa vào role string ở UI.
6. Session regeneration, CSRF, secure cookie và login throttling tests.

File dự kiến:

- `app/Http/Controllers/Auth/*`, `Account/*`
- `app/Http/Requests/Auth/*`, `Address/*`
- `app/Policies/AddressPolicy.php`, `OrderPolicy.php`
- `routes/auth.php`
- `tests/Feature/Auth/*`, `Account/*`

Tiêu chí hoàn thành:

- Guest/user/admin boundaries được test.
- User không đọc/sửa address hoặc order của user khác.
- SSR không rò rỉ dữ liệu nhạy cảm trong shared props.

### Phase 6 — Cart và wishlist (3–4 ngày)

**Trạng thái 2026-08-21:** hoàn thành backend, React integration, automated tests và Docker/browser verification.

Mục tiêu: backend-backed cart nhất quán, vẫn giữ UX React.

Kiến trúc:

- Guest cart: UUID cookie/localStorage identifier, dữ liệu authoritative ở database; nếu tiếp tục localStorage-only thì server phải revalidate toàn bộ khi checkout.
- Auth cart: một active cart/user.
- Login: transaction merge guest cart vào user cart, cộng quantity có giới hạn stock, không tin giá client.

Công việc:

1. `CartService` chịu trách nhiệm get/create/merge/add/update/remove/reprice.
2. Endpoint mutation nhỏ dưới `/api/v1/cart` hoặc Inertia actions; response trả cart summary chuẩn hóa.
3. Wishlist toggle và account wishlist qua policy, unique constraint và idempotent endpoint.
4. Xử lý inactive product, out-of-stock, quantity limit, simultaneous update và installation option.
5. Chưa áp coupon vĩnh viễn vào cart nếu chưa có pricing engine; lưu code và tính lại mỗi request.

Tiêu chí hoàn thành:

- Guest/auth/merge/concurrency/idempotency có test.
- Client sửa giá trong request không ảnh hưởng kết quả.
- Cart totals luôn được tính từ database và pricing service.

### Phase 7 — Pricing, promotion, coupon, shipping và installation quote (3–5 ngày)

Mục tiêu: một nguồn tính tiền duy nhất dùng chung cart và checkout.

Công việc:

1. Tạo immutable DTO: `Money`, `CartLine`, `PricingContext`, `PricingResult`.
2. `PricingService` tính product price → promotion → coupon → shipping → installation → grand total theo thứ tự đã chốt.
3. Quy tắc rounding VND và stacking discount phải được tài liệu hóa.
4. Coupon validation: active window, minimum order, usage, per-user, applicable scope, maximum discount.
5. Shipping quote theo địa chỉ/rule cấu hình; tạo interface để sau này gắn GHN/GHTK.
6. Installation quote theo product/category/BTU và ghi rõ dịch vụ/phụ phí.
7. Endpoint `POST /api/v1/checkout/validate` chỉ trả quote; không tạo order.

Tiêu chí hoàn thành:

- Pricing table-driven tests bao phủ boundary date, stacking, rounding, coupon exhaustion và installation.
- Cart page và checkout validation dùng cùng một service.

### Phase 8 — Checkout và order transaction (4–6 ngày)

Mục tiêu: tạo đơn an toàn, idempotent và không oversell.

Luồng bắt buộc:

1. Validate customer/address/payment method.
2. Mở database transaction.
3. Lock product/inventory rows bằng `lockForUpdate()` theo thứ tự ổn định.
4. Reload sản phẩm, kiểm tra active/stock, chạy lại pricing.
5. Reserve/decrement stock theo chiến lược đã chốt.
6. Tạo order + item snapshots + payment pending + shipment + installation records.
7. Consume coupon atomically.
8. Commit rồi dispatch domain events/jobs; không gọi provider bên ngoài trong transaction.
9. Trả order number; idempotency key ngăn double submit.

Trạng thái đơn hàng phải có transition service, không cho controller gán tùy ý:

`pending → confirmed → processing → shipping → delivered`, với nhánh `cancelled` và `failed` theo điều kiện hợp lệ.

Tiêu chí hoàn thành:

- Test rollback, concurrent stock, stale price, duplicate submit, coupon race và unauthorized order access.
- Total trên order khớp tuyệt đối pricing result server-side.
- Cancel/failed có quy tắc trả tồn kho và coupon rõ ràng.

### Phase 9 — Payments, shipments và installations (3–7 ngày, phụ thuộc provider)

Mục tiêu: adapter architecture sẵn sàng COD/bank transfer và provider tương lai.

Công việc:

1. Interface `PaymentGateway`, `ShippingProvider`; implementation đầu tiên COD/manual.
2. Webhook route có signature verification, replay protection, idempotency và payload audit đã redact.
3. Queue jobs cho provider calls; retry/backoff và dead-letter handling.
4. Shipment tracking/status mapping; installation schedule/status transitions.
5. Notification mail/SMS abstraction cho order events.

Tiêu chí hoàn thành:

- Webhook giả/không hợp lệ bị từ chối; webhook lặp không tạo side effect kép.
- Provider failure không làm mất order và có retry/alert.

### Phase 10 — Filament 4 admin (5–8 ngày)

Mục tiêu: quản trị thật trên cùng Eloquent/domain services, không dùng Filament làm storefront.

Thứ tự resource:

1. Settings, Categories, Brands.
2. Products + images + specifications + SEO + inventory.
3. Articles + related products + SEO.
4. Customers, addresses, reviews moderation.
5. Promotions, coupons.
6. Orders, payments, shipments, installations với action qua transition services.

Yêu cầu:

- Cài Filament 4 đúng PHP/Laravel compatibility và pin major version.
- Admin authentication/authorization, policies và audit log.
- SEO fields có preview/fallback; slug uniqueness; image upload qua Laravel Storage.
- Dashboard widgets dùng query thật: revenue, orders, customers, products, low stock, best sellers, recent orders.
- Không cho admin sửa trực tiếp grand total hoặc chuyển trạng thái sai quy trình.

Tiêu chí hoàn thành:

- Resource authorization tests và critical admin action tests.
- Dashboard không N+1, có date range và timezone Asia/Bangkok hoặc business timezone đã xác nhận.

### Phase 11 — Media, reviews, settings và background jobs (2–4 ngày)

- Chuyển ảnh catalog khỏi URL mẫu sang Storage/S3-compatible; tạo responsive variants/WebP/AVIF và alt text workflow.
- Review chỉ aggregate các review approved; verified purchase lấy từ delivered order item; tuyệt đối không seed rating giả vào production.
- Cache public settings/catalog facets/sitemap có versioned invalidation khi admin cập nhật.
- Scheduler cho promotion expiry, abandoned cart cleanup, sitemap regeneration và low-stock notifications.
- Queue cho email, image processing, feeds và provider integration.

### Phase 12 — Security, observability và performance (3–4 ngày)

- Form Request + policy cho mọi mutation; mass-assignment allowlist; upload MIME/size checks.
- Rate limit login, search, cart, coupon, checkout và webhook theo actor/IP.
- Security headers: CSP phù hợp Inertia, HSTS production, frame/content-type/referrer policy.
- Structured logging với request/order ID; không log password, token, full payment payload hoặc PII không cần thiết.
- Error monitoring, queue failure alert, slow query log, health/readiness endpoints.
- Index review bằng `EXPLAIN` trên MySQL data volume gần production.
- Cache strategy và invalidation; tránh cache HTML account/cart.
- Load test catalog/search/cart/checkout; đặt performance budget và query budget.

### Phase 13 — Deployment và release readiness (3–5 ngày)

Production topology tối thiểu:

- Nginx → PHP-FPM 8.3/Laravel.
- MySQL 8 với backup/PITR.
- Redis cho cache, session, queue và rate limiting.
- Supervisor/systemd cho queue workers và Inertia SSR Node process.
- Scheduler chạy mỗi phút; object storage/CDN cho media.

Pipeline:

1. Composer/npm lock install.
2. Static checks, Pint, TypeScript build, PHPUnit.
3. Client + SSR production build.
4. Migration safety check và backup.
5. Atomic deploy, `config:cache`, `route:cache`, restart queue/SSR.
6. Smoke test homepage/category/product/auth/cart/checkout/admin/sitemap/404.
7. Rollback application và forward-fix migration strategy.

Không launch trước khi:

- Restore backup đã được diễn tập.
- HTTPS/cookies/CORS/trusted proxies đúng production domain.
- Raw HTTP product/category/article chứa SSR SEO data.
- Checkout concurrency và idempotency tests đạt.
- Cron, queue, SSR, mail và alert đều có health check.

## 4. Test matrix bắt buộc

| Nhóm | Kiểm thử |
|---|---|
| Unit | Pricing, coupon, status transition, money/rounding, URL/canonical |
| Feature | Auth, policy, catalog filters, cart, wishlist, checkout, orders, webhooks, admin actions |
| Database | MySQL migration/rollback, constraints, transaction/concurrency |
| SSR/SEO | Raw HTML, metadata, JSON-LD, canonical, robots, sitemap, 404 |
| Browser | Hydration, responsive layout, auth/cart/checkout happy path |
| Performance | Query count, N+1, search/catalog load, checkout contention |
| Security | CSRF, IDOR, rate limit, webhook signature, upload validation, sensitive-data leakage |

Mỗi phase phải giữ toàn bộ test cũ xanh; không chỉ chạy test mới.

## 5. Các quyết định cần stakeholder chốt

Không chặn Phase 3–6, nhưng phải chốt trước Phase 8–9:

1. Payment ban đầu: COD, chuyển khoản, VNPay, MoMo hay ZaloPay.
2. Shipping: rule nội bộ, GHN, GHTK hay đối tác khác.
3. Chính sách giữ/trừ tồn kho và thời gian reservation.
4. Coupon stacking, rounding và quy tắc hoàn coupon khi hủy.
5. Phí lắp đặt theo sản phẩm/BTU/khu vực và lịch hẹn.
6. Email/SMS provider.
7. Domain production, timezone kinh doanh và thông tin Organization/LocalBusiness thật.
8. S3/CDN/image provider và retention policy.

## 6. Ước lượng và milestone

| Milestone | Phase | Ước lượng |
|---|---:|---:|
| Backend đọc dữ liệu + account | 3–5 | 8–11 ngày |
| Commerce core production-ready | 6–8 | 10–15 ngày |
| Provider + admin | 9–10 | 8–15 ngày |
| Hardening + deployment | 11–13 | 8–13 ngày |
| Tổng còn lại | 3–13 | 34–54 ngày công |

Ước lượng giả định một senior full-stack làm toàn thời gian, yêu cầu nghiệp vụ được phản hồi nhanh và không bao gồm thời gian chờ tài khoản payment/shipping provider. Có thể rút ngắn thời gian lịch bằng cách song song hóa Filament/content với commerce sau khi Phase 3 ổn định.

## 7. Slice nên thực hiện tiếp theo

Thực hiện **Phase 10 — Filament 4 admin** tiếp theo. Phase 9 đã hoàn thành provider-ready foundation với manual adapters; tích hợp provider thương mại cụ thể chỉ bắt đầu khi có tài khoản sandbox, credentials và business decision.

## 8. Báo cáo thực hiện Phase 3

Đã thực hiện:

- Chuẩn hóa migrations customer/content/commerce thành cấu trúc dễ bảo trì.
- Bổ sung order idempotency key, currency, address snapshot, product snapshot, line discount, installation snapshot và placed timestamp.
- Bổ sung coupon maximum discount, per-user limit, redemption ledger; promotion priority, stacking và phạm vi product/category/brand.
- Cart unique key đã phân biệt cùng sản phẩm có/không lắp đặt; thêm expiration và user/status index.
- Review hỗ trợ danh tính guest, moderation timestamp và product/status index.
- Bổ sung 9 backed enums và Eloquent casts cho trạng thái/discount type.
- Bổ sung toàn bộ Eloquent models và relationships cho customer/commerce domain.
- Bổ sung factories cho address, cart, coupon, promotion, order; foundation seeder cho currency/timezone/checkout limit.
- Bổ sung database feature tests cho schema, enum casts, cart constraint, order snapshots, relationships và cascade delete.
- Laravel Pint đã chuẩn hóa PHP source.

Kết quả:

- `php artisan migrate:refresh --seed --force`: đạt trên SQLite.
- `php artisan test`: 14 tests, 93 assertions, tất cả đạt.
- `npm run build`: client và SSR production build đều đạt.
- MySQL 8: ban đầu chưa có local service; hiện MySQL 8.0.46 trong Docker đã migrate và seed thành công.

Quyết định có chủ ý:

- Chưa thêm inventory reservation/movement tables cho đến khi chốt chính sách giữ tồn kho và thời gian reservation.
- Chưa thêm status-transition service, pricing engine hoặc checkout logic; thuộc Phase 7–8.
- Chưa thêm DB-native enum để tránh migration khó thay đổi; PHP backed enums + validation/service sẽ là contract, cột DB giữ `varchar` có index.

## 9. Báo cáo thực hiện Phase 4

- Taxonomy public dùng whitelist top-level: `/dieu-hoa`, `/tu-lanh`, `/may-giat`, `/tivi`, `/do-gia-dung`, `/may-nuoc-nong`, `/may-hut-bui`, `/quat`.
- Product canonical route đổi thành `/{category-slug}/{product-slug}`; controller xác minh product thuộc đúng category, URL ghép sai trả HTTP 404.
- `CatalogQuery` dùng chung filter/search/sort và product-card projection, tránh duplicate query logic.
- Category controller không còn hard-code điều hòa; filter BTU/inverter chỉ xuất hiện và được áp dụng cho category điều hòa.
- Brand page có server filters, pagination, SEO, canonical, breadcrumb và CollectionPage JSON-LD.
- Tin tức có listing `/tin-tuc`, article SSR, author/date, Article + Breadcrumb JSON-LD và related products.
- Search `/tim-kiem?q=` luôn `noindex,follow`; header có GET search form thật. Suggestion endpoint duy nhất là `/api/v1/search/suggestions`, có validation, limit, throttle và chỉ trả dữ liệu active.
- Sitemap chứa home, categories, products, brands, article index/articles; loại trừ search/facets/private routes.
- Seed mở rộng đủ 8 category, 6 brand, 10 product và 2 article liên kết sản phẩm.

Kết quả: 21 tests/269 assertions đều đạt; query budget category ≤15; client/SSR production build đạt; raw SSR đạt cho category/brand/article/search; desktop/mobile hydration và navigation đạt, không có console warning/error.

## 10. Báo cáo thực hiện Docker + Phase 5

- Thêm multi-stage `Dockerfile`, `compose.yaml`, `.dockerignore` và `.env.docker.example`.
- Stack gồm Laravel PHP 8.3, MySQL 8.0, Redis 7, Inertia SSR Node, queue worker và scheduler; health dependency ngăn app chạy trước database/cache.
- MySQL 8.0.46 đã chạy toàn bộ migrations không phá hủy và seed đủ catalog/content/commerce.
- Dùng Laravel session auth same-origin: register, login/logout, login throttle, forgot/reset password và email verification.
- Account hỗ trợ cập nhật profile, đổi mật khẩu và address create/update/delete. `AddressPolicy` chặn IDOR; transaction bảo đảm một địa chỉ mặc định.
- Inertia chỉ share allowlist user (`id`, `name`, `email`, `email_verified_at`, `phone`, `role`), không serialize password hay remember token.
- React thêm auth/account pages theo màu sắc, typography và layout storefront hiện hữu; header account link thay đổi theo session.
- Kết quả tự động: 26 tests/311 assertions, TypeScript check, Pint và client/SSR production build đều đạt.
- Chưa triển khai cart, wishlist mutation, checkout, order workflow hay Filament trong Phase 5.

## 11. Báo cáo thực hiện Phase 6

- `CartService` là nguồn thao tác duy nhất cho resolve/create/add/update/remove/merge và serialize cart.
- Guest nhận UUID qua cookie mã hóa, HttpOnly, SameSite theo session config; cart item authoritative nằm trong database, không lưu giá client.
- Authenticated user dùng active database cart. Login merge guest cart trong transaction, khóa user/cart/item và giới hạn số lượng theo tồn kho/server maximum.
- Inactive, unavailable, soft-deleted hoặc hết hàng không thể thêm; subtotal hiển thị lấy từ `Product::currentPrice()` và được ghi rõ sẽ revalidate ở checkout.
- Cart item mutation xác minh cart theo authenticated user hoặc guest token; truy cập item của cart khác trả HTTP 404.
- Wishlist yêu cầu đăng nhập, dùng unique constraint và `firstOrCreate` để add idempotent; danh sách account chỉ lấy dữ liệu của user hiện tại.
- Header cart badge, product detail, category cards và shared catalog cards đã nối với backend mà không đổi design system.
- Thêm `/gio-hang`, `/tai-khoan/yeu-thich`, cart item mutations và wishlist add/remove; private commerce pages dùng `noindex,nofollow` và robots chặn URL tiếng Việt thực tế.
- Automated suite: 32 tests/361 assertions; TypeScript, Pint, client build và SSR build đạt.
- Docker/browser: guest add cart, badge update, cart quantity update, SSR hydration, desktop/mobile layout và console đều đạt trên MySQL 8/Redis.
- Chưa triển khai coupon/pricing engine, shipping/installation quote, checkout hoặc order creation; các phần này thuộc Phase 7–8.

## 12. Báo cáo thực hiện Phase 7

Đã triển khai một pricing engine duy nhất cho cart và bước validate trước checkout:

- Tiền tệ dùng số nguyên VND; phần trăm làm tròn half-up, không dùng số thực cho tổng tiền.
- Giá sản phẩm authoritative lấy từ `Product::currentPrice()`. Thứ tự tính là product subtotal → promotion → coupon → shipping → installation.
- Promotion được giới hạn theo product/category/brand. Nếu có promotion không stack, promotion hợp lệ có priority cao nhất thắng; nếu không có, các promotion stackable được áp tuần tự theo priority lên phần tiền còn lại.
- Coupon kiểm tra thời gian hiệu lực, trạng thái, tổng tối thiểu, usage limit toàn cục, giới hạn theo user và maximum discount. Quote không tăng `used_count`; việc consume coupon phải được khóa và ghi ledger trong transaction của Phase 8.
- Shipping mặc định cấu hình qua `config/commerce.php`/bảng `settings`: miễn phí từ 5.000.000đ sau discount; Hà Nội/TP.HCM 50.000đ; khu vực khác 90.000đ.
- Installation quote hiện cấu hình theo ngành hàng: điều hòa ≤12.000 BTU 350.000đ, ≤18.000 BTU 450.000đ, lớn hơn 550.000đ; máy nước nóng 250.000đ. Đây là rule cấu hình tạm thời cần nghiệp vụ xác nhận trước launch.
- Cart lưu coupon trong session, hiển thị breakdown promotion/coupon/shipping/installation và tổng cuối. Product page cho phép chọn yêu cầu lắp đặt khi thêm giỏ.
- `POST /api/v1/checkout/validate` reload cart authoritative và trả quote server-side; total giả mạo do client gửi không được sử dụng. Endpoint này chưa tạo order.
- Seeder bổ sung pricing settings, promotion mẫu theo category điều hòa và coupon `DIENMAY100`.
- Sửa tên pivot promotion trong Eloquent cho khớp migrations (`promotion_product`, `promotion_category`, `promotion_brand`).

Kết quả xác minh:

- Toàn bộ suite: 39 tests, 385 assertions, đều đạt.
- Laravel Pint, `npx tsc --noEmit`, client build và Inertia SSR build đều đạt.
- Docker PHP 8.3, MySQL 8, Redis, app, SSR, queue và scheduler đều hoạt động; app/MySQL/Redis healthy.
- Browser desktop và mobile 390×844: cart hydration, coupon, installation, responsive layout và nút Phase 8 bị khóa đều đạt; không có horizontal overflow.

Ranh giới có chủ ý: chưa tạo order, chưa reserve/trừ stock, chưa consume coupon, chưa tích hợp payment/shipping provider và chưa mở thanh toán. Các thao tác này thuộc Phase 8–9.

## 13. Báo cáo thực hiện Phase 8

Đã triển khai checkout và order transaction end-to-end cho guest và authenticated customer:

- `/thanh-toan` render bằng Inertia SSR, dùng UI storefront hiện hữu và nhận địa chỉ đã lưu hoặc snapshot địa chỉ nhập mới.
- `CheckoutService` khóa cart, cart items, products và coupon bằng `lockForUpdate()` theo thứ tự product ổn định trong database transaction.
- Tồn kho, trạng thái sản phẩm, giá, promotion, coupon, shipping và installation đều được reload/tính lại server-side; mọi total gửi thêm từ client bị bỏ qua.
- Chiến lược Phase 8 là decrement stock ngay khi order pending được tạo. Order item giữ immutable product/price/discount/installation snapshots.
- Transaction tạo đồng thời order, order items, payment pending dạng manual, shipment pending, installation records, coupon redemption và chuyển cart sang `converted`.
- UUID idempotency key có unique constraint; gửi lại cùng key trả cùng order và không trừ tồn/coupon lần hai.
- `OrderPlaced` triển khai `ShouldDispatchAfterCommit`, bảo đảm listener tương lai chỉ chạy sau commit.
- `OrderStatusService` là cổng transition duy nhất. `cancelled`/`failed` hoàn tồn kho và coupon đúng một lần qua `stock_released_at`/`coupon_released_at`; transition không hợp lệ bị từ chối.
- Guest chỉ xem được order ID đã ghi trong session; authenticated customer chỉ xem được order thuộc chính mình. Có trang chi tiết order và danh sách `/tai-khoan/don-hang`.
- Route hủy đơn đã chuẩn bị qua `POST /don-hang/{number}/huy`, áp ownership và status transition service.

Verification:

- 45 tests, 417 assertions đều đạt trên SQLite test database cô lập.
- Bao phủ authoritative totals, rollback thiếu tồn, duplicate submit, coupon exhaustion, cancel restore và unauthorized order access.
- TypeScript và Pint đạt; client + Inertia SSR production build đạt.
- Docker storefront đã build/recreate, app/MySQL/Redis healthy và homepage HTTP 200.
- Browser end-to-end trên MySQL đạt: add cart → checkout SSR → validate shipping → đặt đơn → confirmation; desktop/mobile không tràn ngang. QA tạo đơn development `DM-20260821-KZM2EAS4`.

Ranh giới Phase 9: `manual` payment record chỉ là trạng thái nội bộ; chưa gọi ngân hàng/COD provider, chưa webhook, tracking carrier, notification hoặc lịch lắp đặt thực tế.

## 14. Báo cáo thực hiện Phase 9

Đã triển khai provider architecture mà không giả lập kết nối thương mại chưa có credentials:

- `PaymentGateway`, `ShippingProvider` và `CustomerNotifier` là contracts độc lập; implementations đầu tiên là `ManualPaymentGateway`, `ManualShippingProvider` và `MailCustomerNotifier`.
- `InitializePayment` và `CreateShipment` chạy qua queue sau commit, unique theo aggregate ID, có 5 attempts, exponential backoff, ghi `last_error`, log critical khi exhausted và sử dụng bảng `failed_jobs` làm dead-letter store.
- `OrderPlaced` listener chỉ enqueue provider work sau transaction. Payment/shipment sync timestamp và sanitized provider payload được lưu riêng.
- Payment webhook và shipping webhook dùng HMAC-SHA256 trên `timestamp.rawBody`, giới hạn timestamp mặc định 300 giây, event ID bắt buộc và rate limit.
- `webhook_events` có unique `(provider, external_id)`, SHA-256 payload hash, processed/failed state và payload audit đã redact. Duplicate giống hệt trả success idempotent; cùng event ID nhưng payload khác trả HTTP 409.
- Payment status transitions được giới hạn; payment `paid` có thể confirm pending order. Provider failure không xóa hoặc fail order tự động.
- Shipping status mapping hỗ trợ ready/shipping/delivered/failed/returned; tracking/carrier được lưu và order được advance qua transition service, không gán trạng thái trực tiếp.
- `InstallationSchedulingService` kiểm soát lịch tương lai và transitions pending → scheduled → in_progress → completed, cùng cancelled/failed branches.
- Notification abstraction hiện gửi email queued nếu order có email. SMS là adapter tương lai, không hardcode provider.
- Secrets chỉ đọc từ environment: `MANUAL_PAYMENT_WEBHOOK_SECRET`, `MANUAL_SHIPPING_WEBHOOK_SECRET`; nếu thiếu, webhook trả 503 thay vì chạy không xác thực.

Verification:

- 51 tests, 446 assertions đều đạt.
- Bao phủ invalid/stale signature, duplicate/replay conflict, payload redaction, payment/order status, shipping tracking/status mapping, provider failure persistence, installation scheduling và on-demand notification.
- TypeScript, Pint, client production build và Inertia SSR build đều đạt.
- Migration `2026_08_21_000500_add_provider_integration_foundation` chạy thành công trên MySQL 8; Docker app/queue/Redis/MySQL healthy. Storefront HTTP 200/SSR và webhook chưa có secret fail-closed HTTP 503.

Ranh giới có chủ ý: chưa tích hợp VNPay/MoMo/ZaloPay/GHN/GHTK do chưa có provider decision và sandbox credentials; manual adapters không tạo transaction/tracking giả.

## 15. Báo cáo thực hiện Phase 11 — Stabilization và storefront parity

Đã hoàn thiện slice ổn định hóa và hai khoảng trống storefront được xác định sau Phase 10:

- Compare dùng client-side context/localStorage, chống trùng, giới hạn tối đa 4 sản phẩm, tray toàn cục và trang `/so-sanh` responsive. Trang so sánh là nội dung cá nhân hóa nên dùng `noindex,follow`.
- Trang `/khuyen-mai` chỉ lấy promotion active trong đúng thời gian hiệu lực và resolve sản phẩm đủ điều kiện từ product/category/brand scope; header và sitemap đã nối tới route thật.
- Product card ở catalog/category và product detail đều có compare control hoạt động. Nút “Mua ngay” trên product detail thêm sản phẩm authoritative vào cart rồi chuyển tới checkout.
- Inertia test page resolver được chuẩn hóa đúng casing Linux (`resources/js/Pages`) để Docker/test phản ánh production filesystem.
- Test environment được khóa SQLite in-memory, array cache/session/queue/mail và tắt SSR để tránh test vô tình refresh MySQL development.
- Docker development web command dùng PHP router trực tiếp từ `public/`, giữ nguyên Compose environment. Điều này sửa lỗi `APP_KEY` bị mất trong child process của `artisan serve` khi image có `.env` rỗng. Production topology vẫn là reverse proxy + PHP-FPM, không dùng built-in server.

Verification ngày 2026-08-22:

- MySQL 8 `migrate:fresh --seed`: đạt; development seed được khôi phục đầy đủ sau khi phát hiện một lần test command cũ trỏ nhầm MySQL.
- PHPUnit: **56 passed, 516 assertions**, không warning, chạy bằng one-off container với SQLite in-memory.
- Pint: đạt trên 243 files. TypeScript `npx tsc --noEmit`: đạt.
- Production client và SSR builds: đạt; main client JS khoảng 324.95 KB raw/103.86 KB gzip, CSS khoảng 53.48 KB raw/11.86 KB gzip.
- Raw HTTP: `/khuyen-mai`, `/so-sanh` và product canonical đều trả 200; initial response có SSR H1/metadata. Product có Product + Breadcrumb JSON-LD; promotions có Breadcrumb JSON-LD; compare có robots noindex.
- Browser desktop/mobile: hydration, compare persistence, promotion cards, responsive table và horizontal-overflow checks đều đạt; không có console warning/error.

Không triển khai thêm cart/checkout/order/provider/admin trong Phase 11. Các bước tiếp theo là Phase 12 Filament hardening, sau đó media/reviews/jobs, security/observability/performance và production deployment/UAT.

## 16. Báo cáo thực hiện Phase 12 — Filament production hardening

Đã thay quyền truy cập admin nhị phân bằng permission matrix theo vai trò mà không thêm dependency RBAC ngoài:

- `admin`: super-admin tương thích dữ liệu cũ.
- `catalog_editor`: quản lý catalog/promotion/settings liên quan catalog, chỉ xem content.
- `content_editor`: quản lý bài viết và moderation review, chỉ xem catalog.
- `order_operator`: xem khách hàng và quản lý order workflow qua domain action.
- `support`: chỉ xem catalog, commerce, customer và review.
- `read_only`: chỉ xem toàn bộ domain được cấp.
- `customer`: không truy cập Filament.

Policy được đăng ký tập trung cho catalog, content, commerce records, customer và review. Payment/shipment/installation/order không expose generic mutation route; payment totals/status, shipment status và installation status không thể bị sửa trực tiếp qua form CRUD. Order table dùng action xác nhận để gọi `OrderStatusService`; review table gọi `ReviewModerationService` cho approve/reject.

Migration `2026_08_22_000600_create_audit_logs_table` bổ sung append-only audit trail theo actor và polymorphic auditable model. Observer theo dõi create/update/delete/restore trên các aggregate nhạy cảm, bỏ timestamps khỏi diff và redact password/token/secret/provider payload. Login/logout của staff được ghi riêng. Audit không thay thế application/security logs ở Phase 14.

Filament SEO fields cho product/category/brand/article được giới hạn độ dài, slug dùng lowercase hyphen và unique validation; SKU product cũng unique. Canonical vẫn cho phép override URL hợp lệ, còn duplicate canonical cross-entity warning/preview nâng cao có thể bổ sung khi chốt production domain.

Verification:

- MySQL 8 migration: đạt, không phá dữ liệu development.
- Full regression suite: **61 tests, 534 assertions**, đều đạt.
- Phase 12 targeted suite sau login audit: **6 tests, 20 assertions**, đều đạt.
- Pint: đạt sau khi format 255 files. TypeScript: đạt. Docker app image: build đạt.
- Browser Filament: login/dashboard đạt; payment chỉ đọc; review pending hiển thị đúng Duyệt/Từ chối; không còn generic edit/delete ở hai luồng nhạy cảm này.

Ranh giới có chủ ý: chưa thêm MFA/SSO, package RBAC động, audit viewer/export, object storage/CDN, customer review submission, mail provider production hay security headers. Các phần này thuộc Phase 13–14.

## 17. Báo cáo thực hiện Phase 13 — Media, reviews, settings và jobs

Phase 13 bổ sung media abstraction dùng `MEDIA_DISK`, upload validation dùng chung trong Filament, Docker persistent media volume và queue job tạo WebP responsive variants/metadata. Product detail nhận variant URLs qua Inertia và dùng `srcset`; remote seed URLs vẫn tương thích.

Review storefront dùng route authenticated, validation/rate limit và unique product-user. Verified purchase tham chiếu đúng delivered order; review mới/sửa luôn pending. Product UI và Product JSON-LD chỉ dùng cùng tập approved reviews, do đó không công bố rating/review giả hoặc pending.

`SettingsRepository` cache typed values và model event invalidate cache. Scheduler có promotion expiry, abandoned cart, low-stock report, settings warmup và sitemap cache refresh. Mail readiness fail trong production nếu còn log mailer/placeholder sender; provider thực tế vẫn cần credentials.

Verification ngày 2026-08-22: clean MySQL 8 migrations và complete seed đạt; 10 settings được warm; TypeScript đạt; Vite client + Inertia SSR production build đạt; full isolated suite **67 tests/564 assertions** đạt. Browser desktop/mobile không có console error, H1/review UI hydrate đúng và viewport 390 px không tràn ngang. Local MySQL demo được restore bằng clean migration + full seed sau khi phát hiện một lệnh test Compose cũ chạm nhầm DB; quy trình test sau đó chuyển sang SQLite container cô lập.
