# Tổng Hợp Dự Án – Điện Máy 365 (E-Commerce)

## 1. Tổng Quan

Dự án là một nền tảng thương mại điện tử (e-commerce) demo cho cửa hàng bán thiết bị điện máy trực tuyến mang tên **"Điện Máy 365"**. Giao diện toàn bộ bằng tiếng Việt, mô phỏng trải nghiệm mua sắm điện máy chính hãng cho thị trường Việt Nam.

Thuộc dạng **full-stack frontend-backend monorepo** với 2 ứng dụng chính và 1 sandbox.

---

## 2. Cấu Trúc Dự Án

```
E-Commerce/
├── package.json                          # Root monorepo (pnpm workspaces)
├── artifacts/
│   ├── electronics-store/                # ⭐ Ứng dụng chính (Frontend React)
│   │   └── src/
│   │       ├── App.tsx                   # Toàn bộ UI: 14 trang, routing, state
│   │       ├── data/mock-data.ts         # ~30 sản phẩm, danh mục, bài viết, đơn hàng
│   │       ├── components/ui/            # 50+ Radix UI components
│   │       ├── hooks/                    # Custom hooks (mobile, toast)
│   │       ├── pages/                    # Trang 404
│   │       └── index.css                 # Tailwind CSS + theme variables
│   │
│   ├── api-server/                       # Backend API (Express + TypeScript)
│   │   └── src/
│   │       ├── app.ts                    # Cấu hình Express (CORS, pino, routes)
│   │       ├── routes/
│   │       │   ├── index.ts              # Router tổng
│   │       │   └── health.ts             # Health check
│   │       ├── lib/logger.ts             # Pino logger
│   │       └── middlewares/.gitkeep
│   │
│   └── mockup-sandbox/                   # Component Preview Server
│       └── src/
│           ├── App.tsx                   # Dynamic component loader
│           └── .generated/mockup-components.ts
│
└── docs/                                 # (tạo mới) Tài liệu dự án
```

---

## 3. Công Nghệ Sử Dụng

### Frontend – `@workspace/electronics-store`

| Công nghệ | Mục đích |
|-----------|----------|
| **React 19** + TypeScript | UI framework, type-safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS v3** + `@tailwindcss/vite` | Styling (utility-first) |
| **Tailwind Animate** (`tw-animate-css`) | Animation utilities |
| **Wouter** | Client-side routing (lightweight, ~2KB) |
| **Lucide React** | Icon library |
| **Radix UI** | 50+ accessible primitive components (dialog, toast, dropdown, accordion, form...) |
| **Framer Motion** | Page/fragment animations |
| **Recharts** | Data visualization (admin dashboard charts) |
| **Embla Carousel** | Image/product carousels |
| **React Hook Form** + **Zod** | Form state & validation |
| **TanStack React Query** | Data fetching & caching |
| **Class Variance Authority (CVA)** | Component variant management |
| **Tailwind Merge** (`tailwind-merge`) | Class name deduplication |
| **clsx** | Conditional class composition |
| **Sonner** | Toast notification system |
| **Vaul** | Drawer component (mobile filter) |
| **Vercel** (implied) | Likely deployment target |
| **next-themes** | Dark/light theme support (if needed) |

### Backend – `@workspace/api-server`

| Công nghệ | Mục đích |
|-----------|----------|
| **Express 5** | API server framework |
| **TypeScript** | Type-safe server code |
| **Drizzle ORM** | Database ORM (SQLite via D1, likely Cloudflare) |
| **Zod** (`@workspace/api-zod`) | API input validation |
| **Pino** + `pino-http` | High-perf structured logging |
| **cookie-parser** | Cookie middleware |
| **CORS** | Cross-origin resource sharing |
| **esbuild** | Server-side bundling |

### Tooling & Build

| Công nghệ | Mục đích |
|-----------|----------|
| **pnpm workspaces** | Monorepo package management |
| **TypeScript 5.9** | Cross-package type checking |
| **Prettier** | Code formatting |
| **@replit/* Vite plugins** | Replit platform integration |

---

## 4. Trang & Tính Năng Chính

### Customer-facing Pages (`/` trong `App.tsx:255-258`)

| Route | Trang | Mô tả |
|-------|-------|-------|
| `/` | **HomePage** (line 117) | Hero carousel (3 slides), trust badges, category grid, flash sale countdown, best sellers, brand partners, blog articles |
| `/products` | **ProductsPage** (line 145) | Filter by category/brand/price/BTU, sort (popular/sale/price), search suggestions |
| `/products/:id` | **ProductDetail** (line 162) | Image gallery, specs table, delivery/warranty/reviews tabs, add to cart, buy now |
| `/compare` | **CompareExperience** (line 168) | So sánh tối đa 4 sản phẩm, đề xuất sản phẩm phù hợp nhất theo tiêu chí |
| `/cart` | **CartPage** (line 203) | Quản lý số lượng, xóa SP, tóm tắt đơn hàng (phí ship từ 10M miễn phí) |
| `/checkout` | **CheckoutPage** (line 208) | Form thông tin người nhận, giao hàng/lắp đặt, chọn phương thức thanh toán (COD/Chuyển khoản/VISA) |
| `/order-success` | **SuccessPage** (line 215) | Xác nhận đơn hàng, mã tra cứu |
| `/account` | **AccountPage** (line 217) | 4 tabs: Đơn hàng, Yêu thích, Đã xem, Thông tin tài khoản |
| `/news` | **NewsPage** (line 220) | Blog/articles listing |
| `/news/:id` | **ArticlePage** (line 220) | Chi tiết bài viết + sản phẩm liên quan |
| `/admin` | **AdminPage** (line 223) | Dashboard KPI, doanh thu biểu đồ, sản phẩm sắp hết, đơn hàng gần đây |
| `/*` | **NotFound** (line 251) | Trang 404 |

### Components Bổ Trợ

- **Header** – Search bar, wishlist, cart, account icons
- **Footer** – Thông tin công ty, bản đồ cửa hàng, newsletter
- **FloatingContacts** – Hotline, Zalo, Facebook chat, AI chat widgets
- **BottomNav** – Mobile bottom navigation bar
- **QuickViewModal** – Xem nhanh sản phẩm trong modal

---

## 5. Dữ Liệu Demo (`mock-data.ts`)

### Danh Mục (10 mục)
- Điều hòa (128 SP), Tủ lạnh (96), Máy giặt (84), Tivi (146), Nhà bếp (215), Máy nước nóng (42), Máy hút bụi (57), Quạt điện (63), Gia dụng nhỏ (189), Phụ kiện (318)

### Thương Hiệu
- Daikin, Panasonic, LG, Samsung, Casper, Mitsubishi Electric, Toshiba, Aqua, Sharp, Sony, TCL, Philips, Kangaroo, Karofi, Bosch, Dreame...

### Sản Phẩm Chi Tiết (26 items)
Mỗi sản phẩm có: id, tên, thương hiệu, giá, giá gốc, đánh giá, số review, hình ảnh, galleria, tag, tồn kho, đã bán, specs (thông số kỹ thuật), tags (lọc).

### Bài Viết Blog (5 articles)
Chủ đề: tư vấn chọn điều hòa, Inverter, mẹo dùng tủ lạnh, chọn kích thước tivi, so sánh máy giặt.

### Đơn Hàng Demo (5 orders)
Trạng thái: "Đang giao", "Đã giao"

---

## 6. Giá Tiền Tệ

Tất cả giá sử dụng định dạng **Việt Nam Đồng (₫)**:
- Hàm helper `money(n)` → `n.toLocaleString('vi-VN') + '₫'`
- Phí giao hàng: **Miễn phí** đơn ≥ 10.000.000₫, còn lại **35.000₫**
- Phí lắp đặt: **250.000₫** (tùy chọn)
- Trả góp 0% qua thẻ tín dụng (trong checkout)
- Giá hiển thị đã có VAT

---

## 7. State Management

Không dùng thư viện externa (Redux, Zustand...). Toàn bộ state được quản lý bằng **React Context + useState** trong `App.tsx:256-257`:

```typescript
type StoreContext = {
  cart: CartItem[];        // Giỏ hàng
  wishlist: string[];      // Danh sách yêu thích
  compared: string[];      // Danh sách so sánh (max 4)
  toggleWishlist, toggleCompare, addToCart, updateQty, removeCart, openQuickView;
};
```

---

## 8. Routing

Sử dụng **Wouter** (`Switch`, `Route`, `Link`, `useLocation`, `useParams`) – lightweight router, không phải React Router.

---

## 9. Styling Design System

- **Tailwind CSS v4** (qua `@tailwindcss/vite`)
- **Font**: Inter (body) + Space Grotesk (display headings)
- **Color palette** (CSS custom properties):
  - `--primary: 213 84% 34%` → `#0b4fa4` (xanh chính)
  - `--accent: 38 92% 52%` → `#f2ab18` (vàng)
  - `--background: 214 42% 97%` → `#f5f8fc` (nền nhạt)
  - `--foreground: 215 36% 16%` → `#1a2b3d` (chữ tối)
- Hỗ trợ dark mode (`next-themes`)
- Components UI xây dựng bằng **CVA** (Class Variance Authority)

---

## 10. Monorepo Configuration

```
workspace/
├── @workspace/electronics-store  →  artifacts/electronics-store/
├── @workspace/api-server         →  artifacts/api-server/
├── @workspace/api-zod            (shared Zod schemas)
└── @workspace/db                 (shared database)
```

- Quản lý qua **pnpm** (`preinstall` script enforce dùng pnpm)
- TypeScript project references (`tsconfig.json` có `references`)
- Build flow: `pnpm run build` → typecheck tất cả → build từng package

---

## 11. Mô Hình Kinh Doanh

| Khía cạnh | Chi tiết |
|-----------|----------|
| **Loại** | B2C – Bán thiết bị điện máy online |
| **Kênh** | Website responsive (mobile-first) |
| **Thanh toán** | COD, Chuyển khoản (NAPAS), Thẻ tín dụng (VISA) |
| **Giao hàng** | Miễn phí đơn ≥ 10 triệu ₫ |
| **Lắp đặt** | Phí 250.000₫, tùy chọn tại checkout |
| **Bảo hành** | 12 tháng chính hãng, đổi mới 30 ngày |
| **Khuyến mãi** | Flash sale, mã giảm giá (subscribe newsletter) |
| **Hỗ trợ** | Hotline 1800 6865, Zalo, Facebook, AI chat |

---

## 12. Ghi Chú Kỹ Thuật

- **Backend API hiện chỉ có health check** – chưa có endpoints business logic thực tế
- **Database mô tả trong package** như `@workspace/db` và `drizzle-orm` – chưa thấy schema thực tế
- **Mock data** được hardcoded trong `mock-data.ts` – chưa kết nối API thực
- **Multi-language**: UI toàn bộ tiếng Việt
- **Auth**: Chưa có xác thực thực (mock user "Minh Anh")
- **CI/CD**: `.replit` config - có thể deploy trên Replit platform
- **Build target**: Cloudflare Workers (drizzle-orm + D1)

---

## 13. File Quan Trọng Cần Đọc

| File | Nội dung |
|------|----------|
| `artifacts/electronics-store/src/App.tsx` | Toàn bộ ứng dụng React (261 lines) |
| `artifacts/electronics-store/src/data/mock-data.ts` | Dữ liệu demo sản phẩm |
| `artifacts/electronics-store/package.json` | Dependencies frontend |
| `artifacts/api-server/src/app.ts` | Cấu hình Express server |
| `artifacts/electronics-store/src/index.css` | Design system, theme variables |
| `package.json` (root) | Monorepo config, pnpm workspaces |

---

*Tài liệu được tạo tự động ngày 16/08/2026 sau khi đọc toàn bộ source code.*