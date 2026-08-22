# Điện Máy 365 backend/storefront

Laravel 11 + Inertia.js SSR + React 19 + TypeScript + Tailwind CSS v4. Docker development stack dùng PHP 8.3, MySQL 8 và Redis 7.

## Chạy bằng Docker

```bash
docker compose up -d mysql redis ssr app
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --force
```

Storefront: `http://localhost:8000`. Khi cần queue và scheduler:

```bash
docker compose up -d queue scheduler
```

Các biến Docker có thể đặt trong `.env` theo mẫu `.env.docker.example`. Không dùng mật khẩu mặc định của môi trường local cho staging/production.

## Kiểm tra

```bash
php artisan test
npx tsc --noEmit
vendor/bin/pint --test
npm run build
```

Docker/MySQL migration và seed:

```bash
docker compose exec app php artisan migrate:status
docker compose exec app php artisan db:show
```

## Trạng thái

- Phase 0–4: Laravel/Inertia SSR, schema/domain, catalog/category/brand/article/search và SEO public.
- Phase 5: session authentication, email verification, password reset, account/profile/password và address ownership.
- Phase 6: database-backed guest/auth cart, login merge, cart UI và persisted authenticated wishlist.
- Phase 7: server-authoritative pricing, scoped promotions, coupons, configurable shipping/installation quote và checkout validation không tạo order.
- Phase 8: transactional checkout/order creation, product/coupon locks, stock decrement, idempotency, snapshots, cancellation restore và scoped order pages.
- Phase 9: payment/shipping/notifier contracts, manual adapters, queued retry/dead-letter workflow, signed idempotent webhooks, tracking/status mapping và installation scheduling.
- Chưa triển khai: commercial payment/shipping providers cần credentials và Filament resources.

Tài liệu đầy đủ nằm trong thư mục `../../docs/`.
