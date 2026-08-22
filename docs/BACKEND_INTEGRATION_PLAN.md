# BACKEND INTEGRATION PLAN
## Điện Máy 365 – Laravel → Inertia.js → React Storefront + Filament Admin

**Status:** PHASE 0–2 IMPLEMENTED AND VERIFIED  
**Updated:** 2026-08-20  
**Constraint:** React storefront is the approved UI/UX source of truth. Do not rewrite, redesign, or replace it.

## IMPLEMENTATION RECORD — PHASE 0 TO PHASE 2

Implemented on 2026-08-20 in `artifacts/laravel-backend/`:

- Laravel 11.55.1 with PHP production requirement `^8.3`; local verification used PHP 8.2.12 because that is the installed CLI runtime.
- Inertia Laravel adapter and React 19 adapter, client hydration via `hydrateRoot`, and a separate Node SSR entrypoint/bundle.
- Tailwind CSS v4 with the existing Điện Máy 365 design tokens, typography, container widths, color palette, and responsive product layout.
- MySQL configuration in `.env.example`; clean migration/seed verification used the project-local SQLite database because no configured MySQL service/credentials were available.
- Database foundation for users, addresses, catalog, content, carts, wishlists, orders, payments, shipping, installation, reviews, promotions, coupons, and settings.
- Product vertical slice with Eloquent relationships, realistic seeds, clean slug routes, reusable SEO head, Product and BreadcrumbList JSON-LD, correct 404s, and resolvable legacy-ID 301 redirects.
- No public Product/Category REST API was created. Public indexable pages use Laravel controller → Eloquent → Inertia props → React.
- Filament and post-Phase-2 commerce workflows remain deferred by the approved stop condition.

Verification: client/SSR builds succeeded; clean migrations and seeds succeeded; 5 tests/24 assertions passed; raw product HTML contains H1, metadata, canonical, Open Graph, Product JSON-LD and BreadcrumbList JSON-LD; invalid entities return 404; legacy redirect behavior is 301/404 as specified; hydration and a 390px mobile viewport completed without console errors or horizontal overflow.

---

## PHASE 0 – AUDIT FINDINGS

### 0.1 Frontend Architecture

| Item | Detail |
|------|--------|
| Framework | React 19 (catalog version, pre-RSC) |
| Language | TypeScript ~5.9 |
| Build | Vite 6 via `@vitejs/plugin-react` + `@tailwindcss/vite` |
| Routing | Wouter 3.x – lightweight hash/history router, not React Router |
| State | React Context + `useState` only (no Redux/Zustand/Jotai) |
| Styling | Tailwind CSS v4 (CSS-first config via `@theme inline` in `index.css`) |
| Fonts | Inter (body) + Space Grotesk (display headings) loaded from Google Fonts CDN |
| Icons | lucide-react (entire icon set from `lucide-react`) |
| Forms | react-hook-form v7 + @hookform/resolvers + zod |
| Animations | framer-motion (catalog) |
| Carousel | embla-carousel-react |
| UI Primitives | 55 Radix UI components (shadcn/ui "new-york" style, `ui: true`, `rsc: false`) |
| Notifications | sonner |
| Drawer/Sheet | vaul + Radix dialog/sheet |
| Data viz | recharts (admin only) |
| Path alias | `@` → `src/` |
| CSS vars | HSL custom properties in `:root` + `.dark` (next-themes loaded but not used in App.tsx) |
| Container | `.container-store { width: min(100% - 32px, 1240px); margin-inline: auto; }` |
| Mobile breakpoint | 768px (`useIsMobile` hook / `use-mobile.tsx`) |
| Bottom nav | Custom `<BottomNav>` rendered on `md:hidden` |

### 0.2 Current File Tree (Frontend)

```
artifacts/electronics-store/
├── index.html                          # shell: React 18 createRoot, Inter font, OG meta
├── package.json                        # name: @workspace/electronics-store
├── vite.config.ts                      # requires PORT env + BASE_PATH env
├── tsconfig.json                       # extends ../../tsconfig.base.json
├── components.json                     # shadcn "new-york" config
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── main.tsx                        # createRoot + ErrorBoundary
│   ├── App.tsx                         # 261 lines – entire storefront in one file
│   ├── index.css                       # design system (HSL vars, keyframes, utilities)
│   ├── components/
│   │   ├── error-boundary.tsx          # class ErrorBoundary
│   │   └── ui/                         # 55 Radix shadcn components
│   ├── data/
│   │   └── mock-data.ts                # ALL seed data (products, categories, articles, orders)
│   ├── hooks/
│   │   ├── use-mobile.tsx              # useIsMobile ≤ 767px
│   │   └── use-toast.ts                # custom toast reducer (Sonner also installed)
│   ├── lib/
│   │   └── utils.ts                    # cn() = twMerge(clsx())
│   └── pages/
│       └── not-found.tsx               # 404 page (not imported in App.tsx)
```

### 0.3 Routes (Wouter – defined in App.tsx:255-258)

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `HomePage` | Hero carousel, flash sale countdown, sections |
| `/products` | `ProductsPage` | Filter sidebar + mobile drawer, sort, search |
| `/products/:id` | `ProductDetail` | Gallery, specs tabs, add-to-cart, buy-now |
| `/compare` | `CompareExperience` | Side-by-side table, up to 4 products |
| `/cart` | `CartPage` | Qty controls, remove, summary card |
| `/checkout` | `CheckoutPage` | 3-step form (info / shipping / payment) |
| `/order-success` | `SuccessPage` | Thank-you + order tracking stub |
| `/account` | `AccountPage` | 4 tabs: orders, wishlist, viewed, profile |
| `/news` | `NewsPage` | Blog listing |
| `/news/:id` | `ArticlePage` | Article detail + related products |
| `/admin` | `AdminPage` | Mock dashboard (replaces by Filament) |
| `*` | `NotFound` | 404 |

### 0.4 State Model (App.tsx:16-27, 256-257)

```ts
type CartItem = { product: Product; qty: number };
type StoreContext = {
  cart: CartItem[];        // in-memory, lost on refresh
  wishlist: string[];      // product id[]
  compared: string[];      // product id[], max 4
  toggleWishlist(id);
  toggleCompare(id);
  addToCart(product, qty?);
  updateQty(id, qty);
  removeCart(id);
  openQuickView(product);
};
```

All state is transient. No persistence, no auth, no backend.

### 0.5 Mock Data Model (mock-data.ts)

**Categories (10):** air-conditioner, refrigerator, washing-machine, television, kitchen, water-heater, vacuum, fan, small-appliance, accessories.

**Product fields:**
```ts
Product {
  id, name, brand, category, categoryId,
  price, oldPrice, rating, reviews, discount,
  image, gallery[], badge?, stock, sold,
  specs: { label, value }[], tags: string[]
}
```

Air conditioner helper `ac()` adds: btu, inverter flag.  
Generic helper `p()` adds: badge, specs array.

**Articles (5):** id, title, category, date, read time, image, excerpt. Full content is hardcoded HTML in ArticlePage.

**Orders (5):** id, date, total, status ("Đang giao" / "Đã giao"), items[], color.

### 0.6 Existing Backend (api-server)

Minimal Express 5 monolith – single health-check route at `/api/healthz`. No product/order/cart logic. Pino logger. Built with esbuild. TypeScript references `@workspace/api-zod` and `@workspace/db` (not yet implemented). This server will be **replaced** by the Laravel application.

### 0.7 Environment

| Layer | Env vars |
|-------|----------|
| Vite | `PORT`, `BASE_PATH` (required) – add `VITE_API_BASE_URL` |
| Laravel | `.env` – DB_, SANCTUM_, APP_*, FILESYSTEM_DISK |
| Replit | `modules = ["nodejs-24"]`, autoscale deployment |

### 0.8 Design System Lock (must never change)

- Primary blue `#0b4fa4` (213° 84% 34%)
- Deep blue `#073b86`
- Accent gold `#f6b91a` / `#f2ab18` (38° 92% 52%)
- Danger red `#e55937` / `#d44b2e` (2° 72% 49%)
- Success green `#168265`
- Font display: Space Grotesk 500-700
- Font body: Inter 400-700
- Radius: `0.75rem`
- Max container: `1240px`
- All Tailwind utilities extend from HSL vars

---

## PHASE 1 – MIGRATION PLAN

### 1.1 Guiding Principles

1. The approved storefront remains the visual source of truth; React files may be refactored where Inertia, SSR, SEO, routing, accessibility, or Laravel data flow require it.
2. UI components, design tokens, spacing, responsive behavior, and animations are preserved where technically possible.
3. Mock data in `mock-data.ts` stays until API layer is proven working, then is **gradually** replaced — not deleted.
4. All new frontend code lives in `src/services/` and `src/types/` folders.
5. No visual changes: no new CSS, no component renames, no layout changes.

### 1.2 Target Stack

```
Customer Storefront               Admin Panel
─────────────────────             ──────────────────────────
React 19 + TypeScript             Laravel 11
Vite 6                            Filament 4.x
Tailwind CSS v4                   MySQL 8.0
Inertia.js                        Laravel Sanctum
Wouter (→ Inertia Link)           Filament Shield (permissions)
lucide-react
Framer Motion
Sonner / Radix UI
         │                              │
         └──────────┬───────────────────┘
                    ▼
              Laravel 11
              Inertia.js (SSR + SPA)
                    │
              MySQL 8.0
                    │
              Eloquent ORM
                    │
              Laravel Sanctum
```

_Backend will be a fresh Laravel 11 project placed at `artifacts/laravel-backend/`._

**Final architecture (post-SEO audit + revision):** The original plan specified a REST API layer. After SEO analysis, the architecture has been upgraded to **Laravel 11 + Inertia.js + React**. This enables server-rendered initial HTML (critical for SEO) while preserving the existing React component tree. The React storefront receives server-rendered HTML with full meta tags, structured data, and clean URLs on first request, then operates as an SPA for subsequent navigation.

**See `docs/REVISED_ARCHITECTURE.md` for the complete revised architecture** including:
- Final URL taxonomy (slug-based, hierarchical)
- SEO database schema additions
- Filament SEO management
- Structured data (JSON-LD) strategy
- 404 handling requirements
- Sitemap strategy
- Google Merchant Center readiness
- Exact frontend/Laravel file changes
- Updated migration plan

### 1.3 New Folder: `artifacts/laravel-backend/`

```
artifacts/laravel-backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/
│   │   │       ├── V1/
│   │   │       │   ├── ProductController.php
│   │   │       │   ├── CategoryController.php
│   │   │       │   ├── BrandController.php
│   │   │       │   ├── CartController.php
│   │   │       │   ├── OrderController.php
│   │   │       │   ├── AuthController.php
│   │   │       │   ├── WishlistController.php
│   │   │       │   ├── ArticleController.php
│   │   │       │   ├── PromotionController.php
│   │   │       │   └── SearchController.php
│   │   │       └── Controller.php          # base API controller
│   │   ├── Resources/
│   │   │   └── Api/
│   │   │       ├── ProductResource.php
│   │   │       ├── CategoryResource.php
│   │   │       ├── BrandResource.php
│   │   │       ├── CartResource.php
│   │   │       ├── OrderResource.php
│   │   │       ├── ArticleResource.php
│   │   │       └── UserResource.php
│   │   ├── Requests/
│   │   │   ├── V1/
│   │   │   │   ├── StoreCartItemRequest.php
│   │   │   │   ├── UpdateCartItemRequest.php
│   │   │   │   ├── StoreOrderRequest.php
│   │   │   │   └── LoginRequest.php
│   │   │   └── ApiRequest.php              # base with sanctum auth
│   │   └── Middleware/
│   │       └── EnsureCustomer.php           # optional role gate
│   ├── Models/
│   │   ├── User.php                         # extends Authenticatable + Sanctum
│   │   ├── Customer.php                     # profile (name, phone, address)
│   │   ├── Address.php
│   │   ├── Category.php
│   │   ├── Brand.php
│   │   ├── Product.php
│   │   ├── ProductImage.php
│   │   ├── Specification.php
│   │   ├── Review.php
│   │   ├── Promotion.php                    # flash sale, coupon, badge
│   │   ├── Coupon.php
│   │   ├── Cart.php / CartItem.php
│   │   ├── Order.php
│   │   ├── OrderItem.php
│   │   ├── Payment.php
│   │   ├── Shipment.php
│   │   ├── Installation.php
│   │   ├── Article.php
│   │   └── Setting.php
│   ├── Http/
│   │   └── Controllers/
│   │       └── Admin/                       # Filament auto-generated
│   └── ...
├── routes/
│   ├── api.php                              # API routes (API v1)
│   └── web.php                              # Filament routes
├── database/
│   ├── migrations/                          # created per section below
│   └── seeders/                             # mirrors existing mock data
├── app/Livewire/                            # not used (Filament v4 uses PHP)
├── app/Filament/
│   ├── Resources/
│   │   ├── ProductResource.php
│   │   │   ├── ProductResource.php
│   │   │   ├── ProductResource.php
│   │   │   └── Pages/
│   │   │       ├── CreateProduct.php
│   │   │       ├── EditProduct.php
│   │   │       └── ListProducts.php
│   │   ├── CategoryResource/
│   │   ├── BrandResource/
│   │   ├── OrderResource/
│   │   ├── CustomerResource/
│   │   ├── ArticleResource/
│   │   ├── PromotionResource/
│   │   ├── CouponResource/
│   │   └── UserResource/
│   ├── Pages/
│   │   ├── Dashboard.php
│   │   └── Settings/
│   └── Widgets/                             # dashboard widgets
├── storage/
│   └── app/public/                          # product images (symbolic link: public/storage)
├── public/                                  # Laravel web root
│   └── storage                               # → ../storage/app/public
├── bootstrap/
├── config/
│   ├── cors.php                             # allow React origin
│   ├── sanctum.php                          # SPA guard + token config
│   └── filesystems.php                      # S3 or local
├── routes/
│   └── api.php                              # v1 routes
├── composer.json
├── package.json                             # for Vite asset build (Laravel Mix alternative)
└── artisan
```

### 1.4 Database Schema

#### 1.4.1 users (Laravel default + Sanctum)

```sql
id (bigint PK)
name
email (unique, nullable – allow guest orders)
email_verified_at (nullable)
password (nullable – social/OTP login support)
phone (unique, nullable)
role: enum['customer','admin','super_admin'] default 'customer'
remember_token
created_at / updated_at

-- Sanctum tokens table (auto-created)
-- personal_access_tokens: id, tokenable_type, tokenable_id, name, token, abilities, last_used_at, expires_at
```

#### 1.4.2 addresses

```sql
id (bigint PK)
user_id (FK → users)
label: varchar(50) "Nhà", "Công ty"
recipient_name
phone
street
ward
district
city (HCM, Hanoi, Da Nang...)
is_default: boolean default false
created_at / updated_at
```

#### 1.4.3 categories

```sql
id (bigint PK)
parent_id (nullable, self-ref – future subcategories)
name (vn: "Điều hòa", "Tủ lạnh"...)
slug: varchar(120) unique
description (nullable)
icon: varchar(50) – lucide icon name "snowflake","refrigerator"...
tone: varchar(30) – Tailwind color class hint
product_count: integer default 0
sort_order: integer default 0
is_active: boolean default true
created_at / updated_at
```

#### 1.4.4 brands

```sql
id (bigint PK)
name (vn: "Daikin","Panasonic","LG"...)
slug: varchar(120) unique
logo: varchar(255) nullable
description (nullable)
sort_order: integer default 0
is_active: boolean default true
created_at / updated_at
```

#### 1.4.5 products

```sql
id (bigint PK)
category_id (FK → categories)
brand_id (FK → brands)
sku: varchar(80) unique
name (vn: "Điều hòa Daikin Inverter 1.5 HP...")
slug: varchar(255) unique
short_description: varchar(500)
description: text (rich HTML from Filament Tiptap editor)
price: bigint (stores VND, no decimals) e.g. 12990000
original_price: bigint – "oldPrice" shown strikethrough
sale_price: bigint nullable – override for promos
stock: integer default 0
min_stock_alert: integer default 5
rating: decimal(3,2) default 0
review_count: integer default 0
sold_count: integer default 0
badge: varchar(50) nullable – "Giá tốt", "Bán chạy", "Mới về"
status: enum['active','draft','archived'] default 'active'
visibility: enum['visible','hidden'] default 'visible'
meta_title: varchar(255) nullable
meta_description: varchar(500) nullable
created_at / updated_at
deleted_at (soft delete)
```

#### 1.4.6 product_images

```sql
id (bigint PK)
product_id (FK → products)
path: varchar(500) – full URL or storage path
alt_text: varchar(255) default ''
sort_order: integer default 0
is_primary: boolean default false
created_at / updated_at
```

#### 1.4.7 specifications

```sql
id (bigint PK)
product_id (FK → products)
group_key: varchar(80) nullable – e.g. "general", "ac_specific"
label: varchar(120)  "Công suất","Công nghệ","Gas"
value: varchar(255) "9.000 BT", "Inverter", "R-32"
sort_order: integer default 0
```

AC-specific fields (kept on `products` for query performance):

```sql
-- On products table (virtual/accessor attributes via JSON or added columns)
ac_specs: json nullable  -- {
  btu: "9.000 BTU|12.000 BTU|18.000 BTU",
  inverter: boolean,
  cooling_type: string,
  energy_rating: string,
  room_size: string,
  warranty_months: integer default 12
}
```

Decision: use `json` column for AC specs to avoid nullable columns for non-AC products. API layer handles serialization.

#### 1.4.8 reviews

```sql
id (bigint PK)
product_id (FK → products)
user_id (FK → users, nullable for guest reviews)
author_name: varchar(120) – fallback for guest
rating: tinyint (1-5)
title: varchar(255) nullable
content: text
is_verified: boolean default false
status: enum['pending','approved','rejected'] default 'pending'
created_at / updated_at
```

#### 1.4.9 promotions

```sql
id (bigint PK)
type: enum['flash_sale','coupon','banner','badge'] default 'flash_sale'
name: varchar(120)
description: varchar(500) nullable
starts_at: datetime
ends_at: datetime nullable
discount_type: enum['percent','fixed'] nullable
discount_value: integer nullable
min_purchase: bigint nullable
max_uses: integer nullable
used_count: integer default 0
status: enum['active','scheduled','expired','disabled'] default 'active'
created_at / updated_at
```

#### 1.4.10 coupons

```sql
id (bigint PK)
code: varchar(30) unique  e.g. "GIAM10"
type: enum['percent','fixed']
value: integer
min_purchase: bigint
max_uses: integer
used_count: integer default 0
per_user_limit: integer default 1
starts_at / expires_at
is_active: boolean default true
created_at / updated_at
```

#### 1.4.11 carts + cart_items

```sql
-- carts: 1 cart per authenticated user (or per guest session)
id (bigint PK)
user_id (FK → users, nullable)
session_id: varchar(100) nullable – for guest carts
currency: varchar(3) default 'VND'
created_at / updated_at

-- cart_items:
id (bigint PK)
cart_id (FK → carts)
product_id (FK → products)
quantity: integer default 1
unit_price: bigint – snapshot at add-time
added_at
created_at / updated_at
-- unique: cart_id + product_id
```

#### 1.4.12 wishlists

```sql
id (bigint PK)
user_id (FK → users)
product_id (FK → products)
created_at
-- unique: user_id + product_id
```

#### 1.4.13 compares

```sql
id (bigint PK)
user_id (FK → users nullable) – if null, session-based
session_id: varchar(100) nullable
product_id (FK → products)
sort_order: integer
created_at
-- unique per session; max 4 rows per session_id
```

#### 1.4.14 orders

```sql
id (bigint PK)
order_number: varchar(30) unique  e.g. "DM365-240619-582"
user_id (FK → users, nullable – guest orders allowed)
status: enum['pending','confirmed','processing','shipping','delivered','cancelled','failed']
  default 'pending'
payment_method: enum['cod','bank_transfer','credit_card','momo','zalopay']
payment_status: enum['unpaid','paid','failed','refunded'] default 'unpaid'
subtotal: bigin
shipping_fee: bigint default 0
installation_fee: bigint default 0
discount_amount: bigint default 0
total: bigint
currency: varchar(3) default 'VND'

recipient_name
recipient_phone
shipping_address_line
shipping_ward
shipping_district
shipping_city
shipping_note

guest_email: varchar(120) nullable – for guest order tracking
guest_token: varchar(80) nullable – UUID for guest order look-up

cancelled_at / cancelled_reason
shipped_at
delivered_at
created_at / updated_at
```

#### 1.4.15 order_items

```sql
id (bigint PK)
order_id (FK → orders)
product_id (FK → products nullable – product might be deleted)
product_snapshot: json – {name, brand, price, image, specs} (historical copy)
quantity: integer
unit_price: bigint – locked at order time
total: bigint
created_at / updated_at
```

#### 1.4.16 shipments

```sql
id (bigint PK)
order_id (FK → orders)
carrier: varchar(80) nullable – "GHTK", "GHN", "Viettel Post"
tracking_number: varchar(120) nullable
status: enum['pending','picking','in_transit','delivered','returned','cancelled']
shipped_at
delivered_at
notes: text nullable
created_at / updated_at
-- One shipment per order initially (expand to multi-parcel later if needed)
```

#### 1.4.17 installations

```sql
id (bigint PK)
order_id (FK → orders, unique 1:1 with order initially)
customer_id (FK → users)
product_id (FK → products)
status: enum['scheduled','confirmed','completed','cancelled'] default 'scheduled'
scheduled_date: date nullable
time_slot: varchar(30) nullable – "08:00-12:00"
technician_name: varchar(120) nullable
technician_phone: varchar(20) nullable
notes: text nullable
completed_at
created_at / updated_at
```

#### 1.4.18 articles

```sql
id (bigint PK)
author_id (FK → users nullable)
category: varchar(80) "Tư vấn mua sắm", "Điều hòa", "Gia dụng", "Tivi", "Máy giặt"
title (vn)
slug: varchar(255) unique
excerpt: varchar(500)
content: longtext (HTML)
featured_image: varchar(500) nullable
read_time: varchar(20) nullable – "6 phút"
status: enum['draft','published','archived'] default 'draft'
published_at: datetime nullable
meta_title / meta_description
created_at / updated_at
```

#### 1.4.19 article_product (pivot)

```sql
article_id (FK → articles)
product_id (FK → products)
-- primary: [article_id, product_id]
```

#### 1.4.20 migrations Index Summary (41 tables total)

| # | Table | Key index |
|---|-------|-----------|
| 1 | `users` | email, phone, role |
| 2 | `addresses` | user_id |
| 3 | `categories` | slug, parent_id, sort_order |
| 4 | `brands` | slug |
| 5 | `products` | category_id, brand_id, slug, sku, status, price, rating |
| 6 | `product_images` | product_id + sort_order |
| 7 | `specifications` | product_id + group_key + sort_order |
| 8 | `reviews` | product_id, user_id, status |
| 9 | `promotions` | type, status, starts_at, ends_at |
| 10 | `coupons` | code, is_active |
| 11 | `carts` | user_id, session_id |
| 12 | `cart_items` | cart_id + product_id unique |
| 13 | `wishlists` | user_id + product_id unique |
| 14 | `compares` | session_id + product_id unique |
| 15 | `orders` | order_number, user_id, status, created_at |
| 16 | `order_items` | order_id + product_id |
| 17 | `shipments` | order_id unique |
| 18 | `installations` | order_id unique |
| 19 | `articles` | slug, status, published_at |
| 20 | `article_product` | article_id + product_id PK |
| 21 | `settings` | key unique |

Sanctum auto-creates: `personal_access_tokens`.

---

## ---

## PHASE 2 – API ENDPOINTS (Laravel `routes/api.php`)

All routes prefixed with `/api/v1`, Sanctum SPA guard (`middleware('api')` + `auth:sanctum` where required).

### 2.1 Public Endpoints (no auth)

```
GET    /api/v1/categories
GET    /api/v1/categories/{slug}
GET    /api/v1/brands
GET    /api/v1/products
GET    /api/v1/products/{id}
GET    /api/v1/products/{slug}
GET    /api/v1/search/suggestions          ?q=...
GET    /api/v1/promotions                 # active flash sales / banners
GET    /api/v1/articles
GET    /api/v1/articles/{slug}
```

### 2.2 Authenticated Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/cart
POST   /api/v1/cart/items                 {product_id, quantity}
PUT    /api/v1/cart/items/{itemId}        {quantity}
DELETE /api/v1/cart/items/{itemId}
DELETE /api/v1/cart                      # clear

GET    /api/v1/wishlist
POST   /api/v1/wishlist/{productId}
DELETE /api/v1/wishlist/{productId}

POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/{orderNumber}
POST   /api/v1/orders/{orderNumber}/cancel

POST   /api/v1/checkout/shipping-options
POST   /api/v1/checkout/validate          # stock + price re-check before submit
```

### 2.3 Query Parameters – Products

| Param | Type | Notes |
|-------|------|-------|
| `q` | string | Full-text search (name, brand) |
| `category` | slug | Filter by category slug |
| `brand` | slug | Filter by brand slug |
| `min_price`, `max_price` | integer (VND) | Price range |
| `rating` | float | Minimum rating |
| `sort` | `popular` \| `sale` \| `price_asc` \| `price_desc` \| `rating` | Default: `popular` |
| `page` | integer | Pagination page |
| `per_page` | integer | Default 20, max 60 |
| `inverter` | bool | AC only |
| `btu` | string | AC only: "9.000 BTU", "12.000 BTU", "18.000 BTU" |

### 2.4 Product Response Shape (matches current frontend `Product` type)

```json
{
  "id": "ac-02",
  "name": "Điều hòa Daikin Inverter 1.5 HP ATKF35XVMV",
  "brand": "Daikin",
  "category": "Điều hòa",
  "category_id": "air-conditioner",
  "price": 12990000,
  "old_price": 16666667,
  "rating": 4.8,
  "reviews": 139,
  "discount": 22,
  "badge": "Bán chạy",
  "stock": 12,
  "sold": 87,
  "image": "https://...",
  "gallery": ["https://...", "https://..."],
  "specs": [
    { "label": "Công suất", "value": "12.000 BTU" },
    { "label": "Công nghệ", "value": "Inverter" }
  ],
  "tags": ["12.000 BTU", "Inverter", "Điều khiển Wi-Fi"],
  "ac_specs": {
    "btu": "12.000 BTU",
    "inverter": true,
    "cooling_type": "Inverter",
    "energy_rating": "A+++",
    "room_size": "15-20 m²",
    "warranty_months": 12
  }
}
```

### 2.5 Category Response Shape

```json
{
  "id": "air-conditioner",
  "name": "Điều hòa",
  "count": 128,
  "icon": "snowflake",
  "tone": "sky"
}
```

### 2.6 Error Response Envelope

```json
{
  "message": "Not Found",
  "errors": { "product_id": ["The selected product is invalid."] }
}
```

All errors use standard Laravel API Resource responses with proper HTTP status codes (422 for validation, 404 with message, 500 generic).

### 2.7 Cart Backend Logic

**Authenticated users:**
- `user_id` links to `carts` table.
- Cart items snapshotted: `unit_price` stored at add-time.
- Stock validated server-side on add/update/remove.

**Guest users:**
- Cart in `localStorage` under key `dm365_guest_cart`.
- Format: `[{ product_id, quantity, unit_price }]`.

**On login:**
1. React calls `POST /api/v1/auth/login` → returns user + token.
2. React calls `GET /api/v1/cart` (authenticated) → server cart.
3. React calls `POST /api/v1/cart/merge` with guest items.
4. Server merges (additive quantities, keep lower price).
5. React clears `localStorage` guest cart.
6. All subsequent cart calls use Bearer token.

### 2.8 Wishlist Backend Logic

- `GET /api/v1/wishlist` – returns product IDs + lightweight product data.
- `POST /api/v1/wishlist/{id}` – toggle add.
- `DELETE` – remove.
- Frontend `AccountPage` wishlist tab fetches from API.

### 2.9 Search – Laravel Implementation

- Use MySQL `FULLTEXT` index on `products.name`, `products.brand`.
- `GET /api/v1/search/suggestions?q=...` returns up to 5 products matching name/brand/category.
- Response: `[{ id, name, brand, category, image }]`.
- Frontend search bar behavior unchanged – suggestions dropdown same UI.

### 2.10 Checkout – Server Validation

Frontend calculates totals for UI display only. On submit:

1. `POST /api/v1/checkout/validate` with cart items.
2. Laravel re-checks: stock availability, current price per product, discount rules.
3. Returns `{ valid, errors: [], server_totals: { subtotal, shipping, installation, discount, total } }`.
4. `POST /api/v1/orders` with validated payload.
5. Order created inside DB transaction (order + items + payment + optional shipment + installation).
6. Frontend shows `SuccessPage` with server-generated order number.

Never trust React-submitted totals.

### 2.11 Order Status Flow

```
pending → confirmed → processing → shipping → delivered
                ↓          ↓
             cancelled  failed
```

Webhook hooks (future):  
`POST /api/v1/webhooks/shipment` – carrier pushes status update.  
`POST /api/v1/webhooks/payment` – payment gateway callback.

### 2.12 Authentication Flow (Sanctum SPA mode)

1. `POST /api/v1/auth/login` – email/phone + password → returns `{ user, token }`.
2. React stores token in `memory` (not localStorage – XSS safe) via a `useAuth()` hook.
3. `Authorization: Bearer {token}` header on all authenticated requests.
4. `POST /api/v1/auth/logout` → revoke token.
5. Sanctum `sanctum.php` config: `stateful` domains include React origin.

Social login (future): Google, Facebook via Laravel Socialite.

---

## PHASE 3 – REACT SERVICE LAYER (FRONTEND ADDITIONS)

### 3.1 New Files to Create

```
artifacts/electronics-store/src/
├── types/
│   ├── api.ts          # shared API response types (mirror backend shapes)
│   └── index.ts
├── services/
│   ├── api.ts          # axios instance, interceptor, token manager
│   ├── productService.ts
│   ├── categoryService.ts
│   ├── brandService.ts
│   ├── cartService.ts
│   ├── wishlistService.ts
│   ├── orderService.ts
│   ├── authService.ts
│   ├── newsService.ts
│   ├── promotionService.ts
│   └── searchService.ts
├── hooks/
│   └── useAuth.ts      # auth state, login/logout, token
└── context/
    └── StoreContext.tsx # extracted from App.tsx (refactor only, no UI change)
```

### 3.2 `src/services/api.ts` – Axios Instance

```ts
import axios from 'axios'; // assume added to package.json

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api = axios.create({ baseURL: API_BASE });

// Attach token from memory store (useAuth hook manages this)
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 handler → auto logout → redirect /account
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearStoredToken();
      window.location.href = '/account';
    }
    return Promise.reject(err);
  }
);
```

### 3.3 `src/services/productService.ts`

```ts
import { api } from './api';
import type { Product, Category, Brand } from '@/types/api';

export const productService = {
  list(params: ProductQueryParams) {
    return api.get<ProductResponse>('/products', { params });
  },
  get(id: string) {
    return api.get<Product>(`/products/${id}`);
  },
  getBySlug(slug: string) {
    return api.get<Product>(`/products/${slug}`);
  },
  searchSuggestions(q: string) {
    return api.get<SearchSuggestion[]>('/search/suggestions', { params: { q } });
  },
};

export const categoryService = {
  list() { return api.get<Category[]>('/categories'); },
  get(slug: string) { return api.get<Category>(`/categories/${slug}`); },
};

export const brandService = {
  list() { return api.get<Brand[]>('/brands'); },
};
```

### 3.4 `src/services/cartService.ts`

```ts
export const cartService = {
  get()                  { return api.get<Cart>('/cart'); },
  addItem(data)          { return api.post<CartItem>('/cart/items', data); },
  updateItem(id, qty)    { return api.put(`/cart/items/${id}`, { quantity: qty }); },
  removeItem(id)         { return api.delete(`/cart/items/${id}`); },
  clear()                { return api.delete('/cart'); },
  merge(guestItems)      { return api.post('/cart/merge', guestItems); },
};
```

### 3.5 `src/services/wishlistService.ts`

```ts
export const wishlistService = {
  list()                 { return api.get<string[]>('/wishlist'); },          // product IDs
  add(id: string)        { return api.post(`/wishlist/${id}`); },
  remove(id: string)     { return api.delete(`/wishlist/${id}`); },
};
```

### 3.6 Data Flow Change (App.tsx refactor — no UI change)

**BEFORE (current):**
```
App.tsx → useState + Context → mock-data.ts products[]
               ↓
         render UI
```

**AFTER:**
```
src/context/StoreContext.tsx  ← extracted from App.tsx
         ↓ uses
src/services/*Service.ts  →  axios  →  Laravel API
         ↓                           ↓
    React state              MySQL / Eloquent
         ↓
     render UI (UNCHANGED)
```

Components (`ProductCard`, `CartPage`, `CheckoutPage`) receive the same props. Context shape is unchanged. Only the data-fetching layer is swapped.

### 3.7 Gradual Mock Data Retirement

| Step | Action |
|------|--------|
| Step 1 | Add `src/services/` and `src/types/api.ts`. No changes to App.tsx yet. |
| Step 2 | Create `src/context/StoreContext.tsx` (extracted). Same behavior. |
| Step 3 | Add `useEffect` data fetches in StoreContext using services. Keep mock data as fallback. |
| Step 4 | Once API verified working in dev, remove mock imports from App.tsx. |
| Step 5 | Delete `src/data/mock-data.ts` after visual regression passes. |

Never delete `mock-data.ts` until the React app renders identically using API data.

---

## PHASE 4 – FILAMENT ADMIN

### 4.1 Filament Resources to Create

| Resource | Key Fields Tabs |
|----------|----------------|
| **ProductResource** | Info, Images (Repeater), Specifications (Repeater), AC Specs (Tabs), Reviews, SEO |
| **CategoryResource** | Info, Products count |
| **BrandResource** | Info, Products count |
| **OrderResource** | Info, Items (Table), Shipment, Installation, Timeline |
| **CustomerResource** | Info, Addresses, Orders, Wishlist |
| **ArticleResource** | Info, Related Products (BelongsToMany), SEO, Content (Tiptap/HTML) |
| **PromotionResource** | Info, Products (BelongsToMany), Coupon link |
| **CouponResource** | Info, Usage stats |
| **ReviewResource** | Info, Moderation (status) |
| **UserResource** | Info, Roles (Spatie permissions or Filament Shield) |

### 4.2 Dashboard Widgets

```php
// Filament Pages/Dashboard.php
Widgets\AccountOverview::make()       // User count
Widgets\RevenueChart::make()          // recharts-like (Filament Charts: bar, line)
Widgets\RecentOrdersTable::make()     // last 10 orders with status badges
Widgets\LowStockProducts::make()      // products where stock <= min_stock_alert
Widgets\BestSellersTable::make()      // top products by sold_count
Widgets\OrdersByStatus::make()        // donut chart (pending/confirmed/etc)
```

### 4.3 Filament Plugins

- `filament/spatie-laravel-permissions` – role management.
- `filament/_password-toggle` – password visibility.
- `filament/breezy` – optional profile management (or custom).
- `pxlrbt/filament-excel` – export orders/products.
- `ahasna/filament-seo` – meta fields on products/articles.

### 4.4 Filament Access Control

| Role | Access |
|------|--------|
| `super_admin` | Full access |
| `admin` | Products, Orders, Customers, Articles – no settings |
| `editor` | Articles, Promotions only |
| `viewer` | Read-only dashboard |

---

## PHASE 5 – ENVIRONMENT & DEPLOYMENT

### 5.1 Environment Variables

**Frontend (`.env` or Replit Secrets):**
```env
VITE_API_BASE_URL=https://api.dienmay365.example.com/api/v1
```

**Laravel `.env`:**
```env
APP_NAME="Điện Máy 365"
APP_URL=https://api.dienmay365.example.com
APP_ENV=production
APP_DEBUG=false

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=dienmay365
DB_USERNAME=laravel
DB_PASSWORD=secret

SANCTUM_STATEFUL_DOMAINS=dienmay365.example.com,localhost:5173
SESSION_DOMAIN=.dienmay365.example.com

FILESYSTEM_DISK=public
```

**CORS (`config/cors.php`):**
```php
'paths' => ['api/*'],
'allowed_methods' => ['*'],
'allowed_origins' => ['http://localhost:5173', 'https://dienmay365.example.com'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

### 5.2 Deployment Topology

```
                    ┌──────────────────────┐
                    │   Cloudflare (CDN)   │
                    │  + DNS + SSL (HTTPS) │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
    ┌─────────▼──────────┐            ┌──────────▼──────────┐
    │    Vite Build      │            │   Laravel Forge /    │
    │  (static assets)   │            │   Vapor / Railway    │
    │  dist/ on CDN      │            │   (PHP 8.3 + MySQL)  │
    │  OR serve via      │            │                      │
    │  Laravel public/   │            │   API: api.dm365...  │
    └────────────────────┘            └──────────────────────┘
              │                                 │
              └────────────┬────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   MySQL 8   │
                    └─────────────┘
```

Option A (recommended for simplicity): Serve Vite build from Laravel's `public/` directory. Laravel handles both `/` (storefront HTML + assets) and `/api/*` routes.

Option B: Separate CDN for storefront, Laravel only serves API + Filament admin.

### 5.3 SEO

- Storefront is SPA – SSR/SSG not required for prototype but recommended for production.
- Consider: Laravel Inertia.js (keeps React, adds SSR) or Next.js migration later.
- For now: pre-render meta tags in `index.html`. Dynamic meta handled by `react-helmet` (already installed via deps) in page components.
- Sitemap: `GET /api/v1/sitemap.xml` – Laravel generates from products + articles.
- Robots: already has `public/robots.txt`.

---

## PHASE 6 – IMPLEMENTATION ORDER

The table below defines the exact sequence. Each phase must be completed and visually verified before the next begins.

| Phase | Task | Artifacts | Estimated |
|-------|------|-----------|----------|
| **2.0** | Laravel foundation | New `artifacts/laravel-backend/` | Day 1 |
| **2.1** | Install Laravel 11 + Sanctum + CORS | `composer.json`, `.env`, `config/sanctum.php` | Day 1 |
| **2.2** | Create all 20 migrations | `database/migrations/` | Day 2 |
| **2.3** | Run migrations, create `db:seed` structure | `database/seeders/` | Day 2 |
| **2.4** | Create all Eloquent Models + relationships | `app/Models/` | Day 3 |
| **2.5** | API Resources (transformers) | `app/Http/Resources/Api/` | Day 3 |
| **2.6** | Inertia storefront controllers (products, categories, brands) | `app/Http/Controllers/` | Day 4 |
| **2.7** | Auth controllers + Sanctum setup | login/register/logout/me | Day 4 |
| **2.8** | Cart controllers (authenticated + guest merge) | cart add/update/remove/merge | Day 5 |
| **2.9** | Wishlist, Search, Promotions endpoints | public + auth | Day 5 |
| **2.10** | Orders + Checkout controller + DB transaction | full order creation | Day 6 |
| **2.11** | Articles, Settings endpoints | read + CRUD | Day 6 |
| **3.0** | Add `axios` to frontend `package.json` | electron `pnpm add axios` | Day 7 |
| **3.1** | Create `src/types/api.ts` | type contracts | Day 7 |
| **3.2** | Create `src/services/` (api.ts + all services) | service layer | Day 7 |
| **3.3** | Create `src/hooks/useAuth.ts` | auth hook | Day 7 |
| **3.4** | Create `src/context/StoreContext.tsx` | extracted from App.tsx | Day 8 |
| **3.5** | Wire `StoreContext` to services (keep mock fallback) | context refactor | Day 8 |
| **3.6** | Replace mock data in `HomePage` with API fetch | products, categories, articles | Day 9 |
| **3.7** | Replace in `ProductsPage` (filters, sort, pagination) | full product listing | Day 9 |
| **3.8** | Replace in `ProductDetail` | product + gallery | Day 10 |
| **3.9** | Replace in `CartPage`, `CheckoutPage`, `SuccessPage` | cart + orders | Day 11 |
| **3.10** | Replace in `AccountPage` (orders, wishlist, profile) | account data | Day 11 |
| **3.11** | Replace in `NewsPage`, `ArticlePage` | articles | Day 12 |
| **3.12** | Delete `src/data/mock-data.ts` after regression pass | cleanup | Day 12 |
| **4.0** | Filament install + admin guard | panel config | Day 13 |
| **4.1** | Filament Resources: Category, Brand | simple CRUD | Day 13 |
| **4.2** | Filament Resource: Product (full) | images, specs, AC specs, SEO | Day 14 |
| **4.3** | Filament Resources: Order, Customer | order management | Day 15 |
| **4.4** | Filament Resources: Article, Promotion, Coupon, Review | content | Day 16 |
| **4.5** | Dashboard widgets + charts | revenue, orders, stock | Day 16 |
| **4.6** | Role & permission setup (Filament Shield) | access control | Day 17 |
| **5.0** | CORS + Sanctum config + .env setup | config | Day 17 |
| **5.1** | Connect frontend to production API base URL | deploy config | Day 18 |
| **5.2** | Visual regression test: compare pre/post screenshots | QA | Day 18 |
| **6.0** | Write integration tests (Pest PHP) | backend tests | Day 19 |
| **6.1** | Frontend smoke tests (Playwright or similar) | E2E basics | Day 20 |
| **6.2** | Load test: 100 concurrent product queries | performance | Day 20 |

---

## PHASE 7 – RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Frontend visual regression | HIGH | Pixel-diff screenshots before/after each page; lock CSS untouched |
| Mock data shapes don't match API | MEDIUM | Define TypeScript types from API shapes first, then implement Laravel Resources to match |
| Sanctum CORS misconfiguration | HIGH | Use `stateful` domains list; test in dev before deploy |
| Cart merge edge cases (guest → auth) | MEDIUM | Unit test merge logic: qty sum, price conflict resolution |
| Order creation race condition (stock) | HIGH | DB-level `CHECK` constraint + Laravel `lockForUpdate()` in transaction |
| Large monolith App.tsx hard to modify | LOW | Extract context first – safe refactor, no UI change |
| Filament version mismatches | LOW | Pin Filament major version in composer.json |
| Image storage migration (Pexels URLs → local) | MEDIUM | Download + store images; update seeder URLs; lazy migration script |

---

## PHASE 8 – OPEN DECISIONS (needs stakeholder input)

1. **Authentication method:** Email/password only, or add phone/OTP (Vietnamese market)?
2. **Payment gateway:** COD only (current mock), or integrate MoMo / ZaloPay / VNPAY?
3. **Shipping carrier:** Manual status, or integrate GHTK / GHN API?
4. **Image hosting:** Keep Pexels URLs, or use Laravel `storage/app/public` + S3?
5. **Review system:** Allow public submissions, or admin-moderated only?
6. **Deployment:** Laravel Forge / Vapor / self-managed VPS?
7. **SSR:** Plan Inertia.js or Next.js migration in roadmap?
8. **Multi-language:** Keep Vietnamese only, or add English later?
9. **Domain strategy:** Subdomain (`api.dm365.vn`) or path-based (`dm365.vn/api`)?

---

## SUMMARY

The React frontend is a well-structured single-file storefront with 12 routes, 55 shadcn/ui components, mock data for 26 products, and a complete checkout flow. It requires zero visual changes.

The backend work is exclusively:
1. New `artifacts/laravel-backend/` Laravel 11 project.
2. 20 migrations + seeders mirroring existing mock data.
3. ~15 API controllers + Resources.
4. Laravel Sanctum auth.
5. Filament admin panel with 10+ resources.
6. React service layer (`src/services/`) with zero component changes.

**Frontend = PROTECTED. Backend = NEW. Admin = Filament.**

---

## IMPLEMENTATION CHECKPOINT — CATEGORY VERTICAL SLICE (2026-08-21)

This checkpoint supersedes the earlier SPA/full-REST recommendations in this document. The implemented storefront architecture is Laravel 11 → Inertia.js SSR → React 19/TypeScript/Tailwind CSS v4. Public indexable pages receive data through controller-supplied Inertia props; REST endpoints are reserved for genuine asynchronous use cases.

Completed in the current slice:

- `GET /dieu-hoa` is a server-rendered category page with Eloquent-backed pagination, search, brand, BTU, inverter, price and sorting controls.
- Unfiltered category URLs are indexable. Faceted/filter URLs emit `noindex,follow` and canonicalize to `/dieu-hoa`; unfiltered pagination has a page-specific canonical.
- Initial HTML contains the category H1, product links/content, title, description, canonical, Open Graph/Twitter metadata, `BreadcrumbList`, and `CollectionPage`/`ItemList` JSON-LD.
- `GET /sitemap.xml` contains canonical public pages backed by active/published database records. `GET /robots.txt` advertises the sitemap and blocks private transactional areas.
- Invalid catalog routes return a genuine Laravel HTTP 404.
- Responsive product cards, desktop filters, mobile filter drawer, clean GET filter URLs and React hydration were browser-verified.
- The original prototype in `artifacts/electronics-store/` remains unchanged; migrated UI lives in `artifacts/laravel-backend/resources/js/`.

Verification result: production client + SSR build succeeded; clean migrations and seeders succeeded; 9 automated tests passed with 74 assertions; raw HTTP and browser checks passed. Local tests use PHP 8.2.12 and SQLite because PHP 8.3/MySQL 8 are not installed/configured in this workspace. Production requirements remain PHP 8.3+ and MySQL 8.

Not implemented by this checkpoint: authentication, cart, checkout, orders, Filament resources/dashboard, Merchant Center feed, and the remaining category verticals.

*Plan authored 2026-08-16; implementation checkpoint updated 2026-08-21.*

## Phase 10 Filament + Home data checkpoint — 2026-08-21

Filament 4.12 được cài tại `/admin` trên Laravel 11/PHP 8.3. Chỉ user `role=admin` có email đã xác minh được truy cập. Panel có 16 resources cho users, addresses, catalog, content, promotions, orders, providers và settings; dashboard hiển thị revenue, orders, customers, products/low-stock và recent orders. Order resource được giữ read-only để không sửa trực tiếp commercial totals.

Home không còn là placeholder: `HomeController` cấp Eloquent props cho hero, 8 categories, flash sale, best sellers, bốn product groups, 10 brands và articles. Seed idempotent hiện có 35 products, 10 brands, 8 categories, 4 articles và demo commerce local/testing cho user/address/cart/wishlist/pending review/order/item/payment/shipment/installation/coupon redemption. Không seed cache/session/jobs hoặc fake approved review/rating.

Composer platform được khóa PHP 8.3 và Symfony 7.4. Raw `/` chứa title/meta/canonical/Open Graph cùng H1, sections và product content từ Inertia SSR. Browser QA desktop xác nhận 39 cards, trang cao khoảng 6105 px và không có console error.
