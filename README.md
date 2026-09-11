# Điện Máy 365

Cửa hàng điện máy với catalog API, tài khoản, giỏ hàng, đặt hàng COD và quản trị đơn/tồn kho.

Xem [hướng dẫn chạy, API và kiểm thử](docs/commerce.md) và [.env.example](.env.example).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

Hướng dẫn tích hợp: [Google, Facebook, VNPAY và MoMo](docs/social-login-payments.md). Kiểm tra cấu hình: `node scripts/check-config.mjs`.

## Chạy bằng Docker

Docker Compose dựng ba dịch vụ: Nginx phục vụ giao diện và proxy `/api`, API Node.js, PostgreSQL có volume lưu dữ liệu.

```powershell
Copy-Item .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
```

Mở `http://localhost:8080`. Xem log bằng `docker compose logs -f api`; dừng bằng `docker compose down`. Lệnh `down` giữ dữ liệu PostgreSQL. Chỉ dùng `docker compose down -v` khi chủ động muốn xóa toàn bộ database Docker.

Trong `.env`, `DOCKER_PUBLIC_ORIGIN` phải bằng URL khách truy cập (mặc định `http://localhost:8080`). Nếu đổi `WEB_PORT`, đổi cả origin. Đổi `POSTGRES_PASSWORD` trước khi triển khai và URL-encode ký tự đặc biệt nếu dùng nó trong connection URL. Production đặt `DOCKER_NODE_ENV=production`, HTTPS origin, bộ khóa production và `PAYMENTS_LIVE_ENABLED=true` sau nghiệm thu. TLS nên kết thúc tại reverse proxy phía trước service `web`; chỉ công khai cổng web, không công khai PostgreSQL. Mặc định tin đúng một proxy hop (`TRUST_PROXY=1`); điều chỉnh nếu topology production khác.
