# REVISED ARCHITECTURE — Inertia.js + SEO-First
## Điện Máy 365 – Updated Plan Post-SEO Audit

> **Implementation status (2026-08-20):** Phase 0–2 is implemented in `artifacts/laravel-backend/` and verified. Laravel 11.55.1, Inertia React, React 19, Vite, Tailwind CSS 4, MySQL production configuration, Inertia SSR, the database foundation, and one product vertical slice are present. Public storefront pages use Laravel web controllers and Inertia props—not a duplicate public REST product API. Filament, checkout, full cart/order workflows, and Merchant Center are intentionally deferred.

This document supersedes the relevant sections of `BACKEND_INTEGRATION_PLAN.md` and `SEO_ARCHITECTURE_AUDIT.md`. All other sections of those documents remain valid unless contradicted here.

---

## 1. FINAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVISED TARGET ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Browser                                                         │
│     │                                                            │
│     │  First request:                                            │
│     │    Laravel → Inertia → SSR React → Full HTML + meta        │
│     │                                                            │
│     │  Subsequent navigation:                                    │
│     │    Inertia XHR → Laravel → JSON props → SPA update         │
│     │                                                            │
│     ▼                                                            │
│   ┌───────────────────────────────────────────────────────────┐  │
│   │              Laravel 11 Application                        │  │
│   │  ┌─────────────────────────────────────────────────────┐  │  │
│   │  │  routes/web.php (Inertia pages)                     │  │  │
│   │  │    GET  /                    → PageController       │  │  │
│   │  │    GET  /products            → PageController       │  │  │
│   │  │    GET  /products/{slug}     → PageController       │  │  │
│   │  │    GET  /compare             → PageController       │  │  │
│   │  │    GET  /cart                → PageController       │  │  │
│   │  │    GET  /checkout            → PageController       │  │  │
│   │  │    GET  /account             → PageController       │  │  │
│   │  │    GET  /news                → PageController       │  │  │
│   │  │    GET  /news/{slug}         → PageController       │  │  │
│   │  │    GET  /brands/{slug}       → PageController       │  │  │
│   │  └─────────────────────────────────────────────────────┘  │  │
│   │                            │                                │  │
│   │                            ▼                                │  │
│   │  ┌─────────────────────────────────────────────────────┐  │  │
│   │  │  app/Http/Controllers/PageController.php             │  │  │
│   │  │    return inertia('app', [                           │  │  │
│   │  │      'page' => 'ProductShow',                        │  │  │
│   │  │      'product' => ProductResource::detail($slug),    │  │  │
│   │  │      'meta' => [                                     │  │  │
│   │  │        'title' => '...',                             │  │  │
│   │  │        'description' => '...',                       │  │  │
│   │  │        'canonical' => '...',                         │  │  │
│   │  │        'og' => [...],                                │  │  │
│   │  │        'twitter' => [...],                           │  │  │
│   │  │      ],                                              │  │  │
│   │  │      'structuredData' => [...],  // JSON-LD           │  │  │
│   │  │      'cart' => $user?->cart,                         │  │  │
│   │  │    ]);                                               │  │  │
│   │  └─────────────────────────────────────────────────────┘  │  │
│   │                            │                                │  │
│   │                            ▼                                │  │
│   │  ┌─────────────────────────────────────────────────────┐  │  │
│   │  │  Eloquent Models                                     │  │  │
│   │  │    Product, Category, Brand, Article, Order, ...    │  │  │
│   │  └─────────────────────────────────────────────────────┘  │  │
│   │                            │                                │  │
│   │                            ▼                                │  │
│   │  ┌─────────────────────────────────────────────────────┐  │  │
│   │  │  MySQL 8.0                                           │  │  │
│   │  └─────────────────────────────────────────────────────┘  │  │
│   │                                                           │  │
│   │  ┌─────────────────────────────────────────────────────┐  │  │
│   │  │  Filament Admin Panel                                │  │  │
│   │  │    /admin → Products, Orders, Customers, Articles   │  │  │
│   │  └─────────────────────────────────────────────────────┘  │  │
│   └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │  React Storefront (artifacts/electronics-store/)          │ │
│   │    resources/js/                                          │ │
│   │      app.tsx          ← Inertia root                      │ │
│   │      Pages/           ← one folder per page               │ │
│   │      Layouts/         ← AppLayout (Header+Footer+Nav)     │ │
│   │      types/           ← PageProps types                   │ │
│   │                                                           │ │
│   │    Tailwind CSS v4 — UNCHANGED                             │ │
│   │    index.css — UNCHANGED                                   │ │
│   │    components/ui/ — UNCHANGED (55 Radix)                   │ │
│   └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. URL ARCHITECTURE (FINAL)

### 2.1 Complete URL Taxonomy

```
PUBLIC PAGES
──────────────────────────────────────────────────────────────────
GET  /                              Homepage
GET  /products                      Category listing (all products)
GET  /products/{category-slug}      Category page (e.g. /dieu-hoa)
GET  /brands                        Brand listing
GET  /brands/{brand-slug}           Brand page (e.g. /brands/daikin)
GET  /brands/{brand-slug}/{category-slug}   Brand + category combo
GET  /products/{product-slug}       Product detail
GET  /compare                       Compare tool (client-side)
GET  /news                          Blog listing
GET  /news/{article-slug}           Article detail
GET  /search                        Search results (optional landing)

AUTHENTICATED PAGES
──────────────────────────────────────────────────────────────────
GET  /cart                          Cart
GET  /checkout                      Checkout
GET  /order-success                 Order confirmation
GET  /account                       Account dashboard
GET  /account/orders                Order history
GET  /account/wishlist              Wishlist
GET  /account/profile               Profile settings

ADMIN
──────────────────────────────────────────────────────────────────
GET  /admin                         Filament panel
GET  /admin/dashboard               Filament dashboard

API (for Inertia partial reloads + AJAX)
──────────────────────────────────────────────────────────────────
GET  /api/v1/search/suggestions     Autocomplete (public)
POST /api/v1/checkout/validate      Stock/price validation (auth)
```

### 2.2 Slug Rules

| Entity | Slug format | Example |
|--------|-------------|---------|
| Category | lowercase, hyphens | `dieu-hoa`, `tu-lanh`, `may-giat`, `tivi`, `nha-bep` |
| Brand | lowercase, hyphens | `daikin`, `panasonic`, `lg`, `samsung` |
| Product | `{brand}-{model-key}` | `daikin-inverter-1-5-hp-atkf35xvmv` |
| Article | `{keyword}-{date}` | `chon-cong-suat-dieu-hoa-theo-dien-tich` |

**Slug uniqueness scope:**
- Product slugs: globally unique
- Category slugs: globally unique
- Brand slugs: globally unique
- Article slugs: globally unique

### 2.3 URL Decision Rationale

**Chosen: Hierarchical slugs** (`/dieu-hoa/daikin-inverter-1-5-hp`)

Rejected alternatives:
- Flat (`/p/daikin-inverter-1-5-hp`): Loses topical hierarchy signal
- ID-based (`/products/42`): Zero keyword signal
- Query-string (`/products?id=ac-02`): Poor UX, poor SEO

Hierarchical provides:
- Clear topical signal (`/dieu-hoa/` → category relevance)
- Breadcrumb-friendly URL segments
- Natural internal linking paths
- Human-readable, shareable URLs

---

## 3. 404 HANDLING (CRITICAL)

### 3.1 Requirement

Every invalid URL MUST return HTTP 404. Never HTTP 200 with a "not found" component.

### 3.2 Implementation (Laravel)

```php
// routes/web.php
Route::get('/products/{slug}', [PageController::class, 'product'])
    ->where('slug', '[a-z0-9-]+')
    ->name('products.show');

Route::get('/products/{slug}', function ($slug) {
    // If no product found by slug, Laravel automatically returns 404
    // because the route won't match a model-bound route.
    // Alternatively, explicit:
    abort(404);
});
```

### 3.3 Model Binding for 404

```php
// app/Models/Product.php
public function getRouteKeyName(): string
{
    return 'slug';
}

// routes/web.php
Route::get('/products/{product:slug}', [PageController::class, 'product']);
// Laravel automatically 404s if slug not found
```

### 3.4 Frontend 404 Handling

- Inertia handles server-side 404s automatically (Laravel `abort(404)` → 404 response)
- No client-side "soft 404" possible
- Custom 404 page rendered server-side with proper HTTP status

---

## 4. SEO DATABASE SCHEMA ADDITIONS

### 4.1 Products Table — SEO Columns

```sql
ALTER TABLE products ADD:
  seo_title: varchar(255) nullable       -- Override <title> tag
  seo_description: varchar(500) nullable -- Override meta description
  canonical_url: varchar(500) nullable   -- Custom canonical if needed
  og_title: varchar(255) nullable        -- Open Graph title
  og_description: varchar(500) nullable  -- Open Graph description
  og_image: varchar(500) nullable        -- Open Graph image URL
  sku: varchar(80) unique                -- Stock keeping unit
  gtin: varchar(50) nullable             -- Global Trade Item Number (EAN/UPC)
  mpn: varchar(120) nullable             -- Manufacturer Part Number
  short_description: varchar(500)        -- For meta + listing cards
  description: text nullable              -- Full product description (200-500 words)
```

### 4.2 Categories Table — SEO Columns

```sql
ALTER TABLE categories ADD:
  seo_title: varchar(255) nullable
  seo_description: varchar(500) nullable
  canonical_url: varchar(500) nullable
  og_title: varchar(255) nullable
  og_description: varchar(500) nullable
  og_image: varchar(500) nullable
  description: text nullable              -- 200-400 words category overview
```

### 4.3 Brands Table — SEO Columns

```sql
ALTER TABLE brands ADD:
  seo_title: varchar(255) nullable
  seo_description: varchar(500) nullable
  description: text nullable              -- Brand overview
```

### 4.4 Articles Table — SEO Columns

```sql
ALTER TABLE articles ADD:
  seo_title: varchar(255) nullable
  seo_description: varchar(500) nullable
  canonical_url: varchar(500) nullable
  og_title: varchar(255) nullable
  og_description: varchar(500) nullable
  og_image: varchar(500) nullable
  meta_keywords: varchar(500) nullable
  content: longtext                       -- Full article HTML (already in mock)
  author_name: varchar(120)
  published_at: datetime nullable
```

### 4.5 Global Settings Table

```sql
CREATE TABLE settings:
  key: varchar(120) unique
  value: text
  type: varchar(30)  -- 'string', 'number', 'boolean', 'json'
```

Used for: site name, site URL, default OG image, Google Analytics ID, etc.

---

## 5. FILAMENT SEO MANAGEMENT

### 5.1 SEO Fields in Filament Resources

Every resource with public-facing pages gets an **SEO tab**:

```
ProductResource
├── Info tab          (name, price, stock, brand, category...)
├── Images tab        (gallery repeater)
├── Specifications tab
├── SEO tab           ← NEW
│   ├── SEO Title
│   ├── Meta Description
│   ├── Canonical URL
│   ├── OG Title
│   ├── OG Description
│   ├── OG Image (file upload)
│   ├── SKU
│   ├── GTIN
│   └── MPN
├── Inventory tab
└── Review tab

CategoryResource
├── Info tab
├── SEO tab           ← NEW
│   ├── SEO Title
│   ├── Meta Description
│   ├── OG Title/Description/Image
│   └── Category Description (rich text)
└── Products tab

BrandResource
├── Info tab
├── SEO tab           ← NEW
│   ├── SEO Title
│   ├── Meta Description
│   ├── OG Title/Description/Image
│   └── Brand Description
└── Products tab

ArticleResource
├── Content tab       (title, content editor, featured image...)
├── SEO tab           ← NEW
│   ├── SEO Title
│   ├── Meta Description
│   ├── Canonical URL
│   ├── OG Title/Description/Image
│   └── Meta Keywords
└── Related Products tab
```

### 5.2 Filament SEO Implementation

Use `filament/seo` or custom form fields. Each SEO tab uses:
- TextInput for titles/descriptions
- FileUpload for OG images (stored in `storage/app/public/og-images/`)
- Character counter for meta description (150-160 chars recommended)
- Character counter for SEO title (50-60 chars recommended)

---

## 6. STRUCTURED DATA STRATEGY

### 6.1 JSON-LD Injection (Server-Side)

Laravel controllers pass `structuredData` as Inertia props. The Blade layout renders it:

```blade
{{-- views/app.blade.php --}}
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  {{-- Dynamic meta from Inertia --}}
  @inertiaHead

  {{-- Structured data --}}
  @isset($structuredData)
    @foreach($structuredData as $schema)
      <script type="application/ld+json">
        {!! json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !!}
      </script>
    @endforeach
  @endisset
</head>
<body>
  @inertia
</body>
</html>
```

### 6.2 Product Schema (JSON-LD)

```php
// app/Http/Controllers/PageController.php → product()
$structuredData = [
    '@context' => 'https://schema.org/',
    '@type' => 'Product',
    'name' => $product->name,
    'image' => $product->primaryImage,
    'description' => $product->short_description,
    'brand' => [
        '@type' => 'Brand',
        'name' => $product->brand->name,
    ],
    'sku' => $product->sku,
    'offers' => [
        '@type' => 'Offer',
        'url' => route('products.show', $product->slug),
        'priceCurrency' => 'VND',
        'price' => $product->price,
        'availability' => $product->stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        'seller' => [
            '@type' => 'Organization',
            'name' => config('app.name'),
        ],
    ],
];

if ($product->rating > 0) {
    $structuredData['aggregateRating'] = [
        '@type' => 'AggregateRating',
        'ratingValue' => (string) $product->rating,
        'reviewCount' => (string) $product->review_count,
    ];
}
```

### 6.3 BreadcrumbList Schema

```php
$structuredData[] = [
    '@context' => 'https://schema.org/',
    '@type' => 'BreadcrumbList',
    'itemListElement' => [
        [
            '@type' => 'ListItem',
            'position' => 1,
            'name' => 'Trang chủ',
            'item' => route('home'),
        ],
        [
            '@type' => 'ListItem',
            'position' => 2,
            'name' => 'Điều hòa',
            'item' => route('categories.show', 'dieu-hoa'),
        ],
        [
            '@type' => 'ListItem',
            'position' => 3,
            'name' => $product->name,
            'item' => route('products.show', $product->slug),
        ],
    ],
];
```

### 6.4 Article Schema

```php
$structuredData = [
    '@context' => 'https://schema.org/',
    '@type' => 'Article',
    'headline' => $article->seo_title ?? $article->title,
    'description' => $article->seo_description ?? $article->excerpt,
    'image' => $article->featured_image,
    'datePublished' => $article->published_at?->toIso8601String(),
    'dateModified' => $article->updated_at->toIso8601String(),
    'author' => [
        '@type' => 'Organization',
        'name' => $article->author_name ?? config('app.name'),
    ],
    'publisher' => [
        '@type' => 'Organization',
        'name' => config('app.name'),
        'logo' => [
            '@type' => 'ImageObject',
            'url' => asset('images/logo.png'),
        ],
    ],
];
```

### 6.5 Organization Schema (Global)

```php
// Included on every page via app.blade.php
$orgSchema = [
    '@context' => 'https://schema.org',
    '@type' => 'Organization',
    'name' => config('app.name'),
    'url' => route('home'),
    'logo' => asset('images/logo.png'),
    'contactPoint' => [
        '@type' => 'ContactPoint',
        'telephone' => '1800-6865',
        'contactType' => 'customer service',
        'availableLanguage' => ['Vietnamese'],
    ],
];
```

### 6.6 Rules

1. **Never generate fake data** — only emit structured data for values present in the database
2. **Never guarantee rich results** — JSON-LD makes pages eligible, Google decides
3. **Structured data must match visible content** — price in JSON-LD must match price shown on page
4. **No ratings/reviews without real data** — only emit `aggregateRating` when `review_count > 0`

---

## 7. GOOGLE MERCHANT CENTER READINESS

### 7.1 Schema Support (Already in Plan)

The database schema already supports all required GMC fields:

| GMC Field | Source |
|-----------|--------|
| `id` | `products.id` |
| `title` | `products.name` |
| `description` | `products.short_description` |
| `link` | `products.slug` → `https://dienmay365.vn/dieu-hoa/{slug}` |
| `image_link` | `product_images.path` (primary image) |
| `price` | `products.price` (VND) |
| `availability` | Derived: `stock > 0` → `in_stock` / `out_of_stock` |
| `condition` | Hardcoded `"new"` |
| `brand` | `brands.name` |
| `gtin` | `products.gtin` |
| `mpn` | `products.sku` |
| `category` | `categories.name` → mapped to Google taxonomy |

### 7.2 Feed Endpoint (Future)

```
GET /api/v1/feeds/google-merchant.xml
```

Returns XML product feed. Not implemented in initial phases — architecture is ready.

---

## 8. SITEMAP STRATEGY

### 8.1 Implementation

```php
// routes/web.php
Route::get('/sitemap.xml', [SitemapController::class, 'index'])
    ->name('sitemap');

// app/Http/Controllers/SitemapController.php
public function index()
{
    $xml = view('sitemap', [
        'products' => Product::where('status', 'active')->get(['slug', 'updated_at']),
        'categories' => Category::where('is_active', true)->get(['slug', 'updated_at']),
        'brands' => Brand::where('is_active', true)->get(['slug', 'updated_at']),
        'articles' => Article::where('status', 'published')->get(['slug', 'updated_at']),
        'baseUrl' => config('app.url'),
    ])->render();

    return response($xml, 200)
        ->header('Content-Type', 'application/xml');
}
```

### 8.2 Sitemap Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dienmay365.vn/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://dienmay365.vn/dieu-hoa</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dienmay365.vn/dieu-hoa/daikin-inverter-1-5-hp</loc>
    <lastmod>2024-06-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- All products, categories, brands, articles -->
</urlset>
```

### 8.3 robots.txt (Production)

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /account/
Disallow: /cart/
Disallow: /checkout/
Disallow: /admin/

Sitemap: https://dienmay365.vn/sitemap.xml
```

---

## 9. INERTIA PAGE STRUCTURE

### 9.1 Page Props Interface

```typescript
// resources/js/types/page.ts
import type { User, Cart, Product, Category, Brand, Article } from '@/types/models';

export interface PageProps {
    page: string;
    user?: User;
    cart?: Cart;
    wishlist?: string[];
    seo: {
        title: string;
        description: string;
        canonical: string;
        og: { title: string; description: string; image?: string };
        twitter: { card: string; title: string; description: string };
        structuredData: Record<string, unknown>[];
    };
}

// Specific page props extend PageProps
export interface HomePageProps extends PageProps {
    featuredProducts: Product[];
    categories: Category[];
    articles: Article[];
    promotions: Promotion[];
}

export interface ProductShowPageProps extends PageProps {
    product: Product;
    relatedProducts: Product[];
    reviews: Review[];
}

export interface CategoryPageProps extends PageProps {
    category: Category;
    products: PaginatedData<Product>;
    filters: FilterOptions;
}
```

### 9.2 Laravel → Inertia Props Flow

```php
// app/Http/Controllers/PageController.php
public function product(string $slug): Response
{
    $product = Product::where('slug', $slug)
        ->where('status', 'active')
        ->firstOrFail(); // 404 if not found

    $seo = [
        'title' => $product->seo_title
            ?? "{$product->name} – Giá tốt nhất | Điện Máy 365",
        'description' => $product->seo_description
            ?? str($product->short_description)->limit(160),
        'canonical' => route('products.show', $product->slug),
        'og' => [
            'title' => $product->og_title ?? $product->name,
            'description' => $product->og_description ?? $product->short_description,
            'image' => $product->og_image ?? $product->primaryImage,
        ],
        'twitter' => [
            'card' => 'summary_large_image',
            'title' => $product->seo_title ?? $product->name,
            'description' => $product->seo_description ?? '',
        ],
        'structuredData' => [$this->productJsonLd($product), $this->breadcrumbJsonLd($product)],
    ];

    return inertia('app', [
        'page' => 'ProductShow',
        'product' => ProductResource::detail($product),
        'relatedProducts' => ProductResource::collection(
            $product->relatedProducts()->limit(4)->get()
        ),
        'seo' => $seo,
        'cart' => auth()->user()?->cart?->load('items.product'),
    ]);
}
```

### 9.3 React Page Components Receive Props via `usePage()`

```tsx
// resources/js/Pages/Products/Show.tsx
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types/page';
import { ProductCard } from '@/components/ProductCard';

export default function ProductShow() {
    const { product, relatedProducts, seo } = usePage<PageProps & {
        product: ProductDetail;
        relatedProducts: Product[];
    }>().props;

    return (
        <main className="container-store py-7">
            {/* Same JSX as current ProductDetail — receives data from props instead of mock */}
            <div className="mb-5 flex items-center gap-2 text-xs text-[#8293a8]">
                <Link href="/products">Sản phẩm</Link>
                <ChevronRight size={14} />
                <span>{product.category}</span>
                <ChevronRight size={14} />
                <b>{product.name}</b>
            </div>
            {/* ... rest unchanged ... */}
        </main>
    );
}
```

---

## 10. EXACT FRONTEND FILES THAT CHANGE

### 10.1 Files That Change (Minimal)

| Current File | Change | Effort |
|-------------|--------|--------|
| `src/App.tsx` | Extract to `AppLayout.tsx`, replace wouter `<Link>` with Inertia `<Link>`, remove routing | 1 day |
| `src/main.tsx` | Wrap with Inertia root (`createInertiaApp`) | 2 hours |
| `src/data/mock-data.ts` | **Delete** — data from Laravel | 1 hour |
| `vite.config.ts` | Update aliases for new `resources/js/` path | 2 hours |
| `index.html` | Replace `<script type="module">` with Inertia entry point reference | 1 hour |

### 10.2 New Files

```
resources/js/
├── app.tsx                    # Inertia root (replaces main.tsx logic)
├── types/
│   └── page.ts                # PageProps interfaces
├── Pages/
│   ├── Home/index.tsx         # from HomePage
│   ├── Products/
│   │   ├── index.tsx          # from ProductsPage
│   │   └── Show.tsx           # from ProductDetail
│   ├── Cart/index.tsx         # from CartPage
│   ├── Checkout/index.tsx     # from CheckoutPage
│   ├── Account/index.tsx      # from AccountPage
│   ├── News/
│   │   ├── index.tsx          # from NewsPage
│   │   └── Show.tsx           # from ArticlePage
│   └── Compare/index.tsx      # from CompareExperience
└── Layouts/
    └── AppLayout.tsx          # Header + Footer + BottomNav (extracted)
```

### 10.3 Unchanged Files

- `src/index.css` — **zero changes**
- `src/components/ui/*` — **55 files, zero changes**
- `src/hooks/use-mobile.tsx` — unchanged
- `src/hooks/use-toast.ts` — unchanged
- `src/lib/utils.ts` — unchanged
- `src/components/error-boundary.tsx` — unchanged
- `public/favicon.svg` — unchanged
- `public/robots.txt` — will be updated by Laravel

---

## 11. EXACT LARAVEL FILES TO CREATE

### 11.1 Core Laravel Structure

```
artifacts/laravel-backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── ProductController.php         # Eloquent → Inertia product page
│   │   │   ├── CategoryController.php        # Eloquent → Inertia category page
│   │   │   ├── BrandController.php           # Eloquent → Inertia brand page
│   │   │   ├── ArticleController.php         # Eloquent → Inertia article page
│   │   │   └── Admin/                        # Filament, deferred
│   │   └── Middleware/
│   │       └── HandleInertiaRequests.php     # auto-generated by Inertia
│   ├── Models/
│   │   ├── User.php
│   │   ├── Address.php
│   │   ├── Category.php
│   │   ├── Brand.php
│   │   ├── Product.php
│   │   ├── ProductImage.php
│   │   ├── Specification.php
│   │   ├── Review.php
│   │   ├── Promotion.php
│   │   ├── Cart.php / CartItem.php
│   │   ├── Order.php / OrderItem.php
│   │   ├── Payment.php
│   │   ├── Shipment.php
│   │   ├── Installation.php
│   │   ├── Article.php
│   │   └── Setting.php
├── routes/
│   ├── web.php                              # Inertia page routes
│   └── api.php                              # AJAX routes
├── database/
│   ├── migrations/                          # ~25 migration files
│   └── seeders/                             # mirrors mock data
├── resources/
│   └── js/
│       ├── app.tsx                          # Inertia root
│       ├── Components/
│       │   └── SeoHead.tsx                  # Dynamic meta component
│       └── Pages/                           # (symlink or copy from frontend)
├── views/
│   ├── app.blade.php                        # Inertia shell
│   └── sitemap.blade.php                    # XML sitemap
├── storage/app/public/                      # Product images
├── bootstrap/
├── config/
│   ├── cors.php
│   ├── sanctum.php
│   └── filesystems.php
├── composer.json
└── artisan
```

---

## 12. ROUTING CHANGES (Summary)

| Old (Wouter) | New (Laravel + Inertia) | Notes |
|-------------|------------------------|-------|
| `/` | `GET /` | Same |
| `/products` | `GET /products` | Same |
| `/products?id=ac-02` | `GET /products/{slug}` | **Changed** — slug replaces ID |
| `/products?category=ac` | `GET /products/{category-slug}` | **Changed** — path segment |
| `/compare` | `GET /compare` | Same |
| `/cart` | `GET /cart` | Same |
| `/checkout` | `GET /checkout` | Same |
| `/order-success` | `GET /order-success` | Same |
| `/account` | `GET /account` | Same |
| `/news` | `GET /news` | Same |
| `/news?id=a-01` | `GET /news/{article-slug}` | **Changed** — slug |
| `/admin` | `GET /admin` | Filament |

---

## 13. FRONTEND CODE CHANGES SUMMARY

### 13.1 What Must Change

**Wouter → Inertia:**
- `import { Link, Switch, Route, useLocation, useParams } from 'wouter'`
- → `import { Link, usePage, useForm } from '@inertiajs/react'`
- `<Link href="/products">` stays syntactically identical (Inertia Link API mirrors wouter)
- `<Switch><Route path="/products" component={...} /></Switch>`
- → Each page becomes a standalone component exported from `Pages/` folder

**Mock Data → Server Props:**
- `import { products } from '@/data/mock-data'`
- → `const { product } = usePage<PageProps>().props`
- Components receive same data shape via props

**State → Server-backed:**
- `const [cart, setCart] = useState<CartItem[]>([])`
- → `const { cart } = usePage().props` (from Laravel session)
- Mutations via Inertia `router.post('/cart/items', ...)` or form helpers

### 13.2 What Must NOT Change

- `index.css` — zero modifications
- `components/ui/*` — all 55 components untouched
- Tailwind class names — identical
- Component JSX structure — identical
- Animations — identical
- Colors, fonts, spacing — identical

### 13.3 Migration Safety Net

```
Before migration:
  src/data/mock-data.ts  ← full data, renders everything

During migration:
  src/data/mock-data.ts  ← kept as fallback
  src/services/api.ts    ← new service layer
  src/context/StoreContext.tsx  ← tries API first, falls back to mock

After verification:
  src/data/mock-data.ts  ← deleted
```

---

## 14. SEO IMPLEMENTATION STRATEGY

### 14.1 Phase-by-Phase SEO Rollout

| Phase | SEO Deliverable | Mechanism |
|-------|----------------|-----------|
| Foundation | SSR initial HTML | Inertia `PageController` |
| Foundation | Unique `<title>` per page | `seo.title` prop → `SeoHead` component |
| Foundation | Unique meta description | `seo.description` prop |
| Foundation | Canonical URLs | `<link rel="canonical">` in `SeoHead` |
| Foundation | OG tags | `seo.og` → `<meta property="og:*">` |
| Foundation | Twitter cards | `seo.twitter` → `<meta name="twitter:*">` |
| Phase 2 | Product JSON-LD | `seo.structuredData[]` → `<script type="application/ld+json">` |
| Phase 2 | BreadcrumbList JSON-LD | Same mechanism |
| Phase 2 | Organization JSON-LD | Global in `app.blade.php` |
| Phase 3 | sitemap.xml | `GET /sitemap.xml` controller |
| Phase 3 | robots.txt | Laravel-served with proper rules |
| Phase 3 | 301 redirects | Laravel middleware for old `?id=` URLs |
| Phase 4 | Article JSON-LD | Article-specific schema |
| Phase 4 | Category description content | CMS field, rendered server-side |
| Phase 5 | Product description content | CMS field, rendered server-side |
| Phase 5 | Image optimization | Lazy load, WebP, CDN |

### 14.2 SeoHead Component

```tsx
// resources/js/Components/SeoHead.tsx
import { usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

export function SeoHead() {
    const { seo } = usePage().props;

    return (
        <Head>
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            <link rel="canonical" href={seo.canonical} />

            {/* Open Graph */}
            <meta property="og:title" content={seo.og.title} />
            <meta property="og:description" content={seo.og.description} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={seo.canonical} />
            {seo.og.image && <meta property="og:image" content={seo.og.image} />}

            {/* Twitter */}
            <meta name="twitter:card" content={seo.twitter.card} />
            <meta name="twitter:title" content={seo.twitter.title} />
            <meta name="twitter:description" content={seo.twitter.description} />

            {/* Structured data rendered server-side in Blade */}
        </Head>
    );
}
```

---

## 15. PERFORMANCE STRATEGY

### 15.1 Code Splitting (Post-Migration)

```tsx
// resources/js/app.tsx
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./Pages/Home'));
const Products = lazy(() => import('./Pages/Products'));
const ProductShow = lazy(() => import('./Pages/Products/Show'));

// Inertia handles SSR — first load is full HTML
// Client-side navigation only loads changed components
```

### 15.2 Image Optimization

| Action | Implementation | Phase |
|--------|---------------|-------|
| Lazy loading | Add `loading="lazy"` to all non-hero `<img>` | Phase 5 |
| WebP/AVIF | Laravel serves WebP via Intervention Image or Cloudflare | Phase 5 |
| CDN | Cloudflare Images or BunnyCDN for VN latency | Phase 5 |
| Dimensions | Add `width`/`height` or `aspect-ratio` to prevent CLS | Phase 5 |
| srcset | Generate responsive sizes server-side | Phase 5 |

### 15.3 Font Loading

- Keep Inter + Space Grotesk
- Add `font-display: swap` explicitly in CSS
- Preload critical font weights in `app.blade.php`
- Consider subsetting Vietnamese characters

---

## 16. DEPLOYMENT ARCHITECTURE

### 16.1 Single-Server Deployment (Recommended)

```
┌───────────────────────────────────────────────────────┐
│                    Nginx / Caddy                       │
│                  (reverse proxy + SSL)                 │
└───────────────────────┬───────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌────▼────┐  ┌────▼────┐
    │ Laravel │   │  Vite   │  │  MySQL  │
    │  :80    │   │  build  │  │  :3306  │
    │ (PHP)   │   │  dist/  │  │         │
    └─────────┘   └─────────┘  └─────────┘
         │
         ├── Serves Inertia pages (SSR)
         ├── Serves Vite-built assets from public/
         ├── Filament admin at /admin
         └── API endpoints at /api/*
```

Laravel's `public/` directory serves the Vite-built React assets. Inertia handles page rendering.

### 16.2 Alternative: Separate Frontend (if scaling)

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Cloudflare │     │  Laravel     │     │  MySQL  │
│  (CDN +     │────▶│  (API only)  │────▶│         │
│   Vite dist)│     │              │     └─────────┘
└─────────────┘     └──────────────┘
```

Not recommended initially — adds complexity. Single-server is sufficient for months/years.

---

## 17. MIGRATION PLAN (Updated)

### Phase 0: Laravel Foundation (2-3 days)
- Install Laravel 11
- Install Inertia.js + `@inertiajs/react`
- Configure Vite (Laravel plugin)
- Create database + run migrations
- Seed initial data (categories, brands, 5 sample products)

### Phase 1: Inertia Pages (5-7 days)
- Create `PageController` with home route
- Migrate `HomePage` component to `Pages/Home/index.tsx`
- Add `SeoHead` component
- Add `<Head>` with dynamic meta
- Migrate Products listing + detail pages
- Migrate News pages
- Migrate remaining pages (Cart, Checkout, Account, Compare)

### Phase 2: SEO Implementation (3-4 days)
- JSON-LD Product schema on product pages
- JSON-LD BreadcrumbList on all pages
- JSON-LD Article on article pages
- Organization schema (global)
- Canonical URLs
- Sitemap.xml
- robots.txt

### Phase 3: URL Migration (2 days)
- Implement slug-based routing
- Add 301 redirects from old `?id=` URLs
- Update all internal links
- Test 404 behavior

### Phase 4: Filament Admin (5-7 days)
- Install Filament
- Create all resources (Product, Category, Brand, Order, Customer, Article, Promotion, Review)
- Add SEO tabs to each resource
- Dashboard widgets
- Role/permission setup

### Phase 5: Integration & QA (3-4 days)
- Wire up cart (server-backed)
- Wire up auth (Sanctum)
- Wire up checkout (server validation)
- Visual regression testing
- SEO validation (Lighthouse, Rich Results Test)
- Performance tuning

### Phase 6: Google Merchant Center (1-2 days)
- Add GTIN column
- Create feed endpoint
- Generate sample feed
- Submit to GMC (manual step)

**Total estimated: 21-27 days**

---

## 18. RISKS & MITIGATIONS (Updated)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Inertia SSR breaks React components | HIGH | Test each page individually; components are self-contained |
| SEO meta incorrect on some pages | HIGH | `SeoHead` component enforces all required fields; unit test |
| Old `?id=` URLs indexed before launch | MEDIUM | 301 redirects in `RouteServiceProvider` |
| Structured data doesn't match visible content | HIGH | Generate from the same Eloquent models that render the page |
| Bundle size after migration | MEDIUM | Inertia lazy-loads page components; initial SSR is fast |
| Cart state migration (client → server) | MEDIUM | Gradual migration with localStorage fallback |
| Filament version compatibility | LOW | Pin Filament major version |
| Vietnamese SEO content quality | MEDIUM | Admin can edit all SEO fields via Filament |

---

## 19. OPEN DECISIONS

| # | Decision | Recommendation |
|---|----------|---------------|
| 1 | URL: `/dieu-hoa/slug` vs `/slug` | Hierarchical (`/dieu-hoa/slug`) |
| 2 | Trailing slash | No trailing slash |
| 3 | Domain | `dienmay365.vn` (non-www) |
| 4 | Image hosting | Cloudflare Images or BunnyCDN |
| 5 | GTIN availability | Ask suppliers; add import column |
| 6 | Payment gateway | Start COD + bank transfer; add MoMo later |
| 7 | Shipping integration | Manual status first; GHTK/GHN API later |
| 8 | Social login | Not in initial scope |
| 9 | Multi-language | Vietnamese only initially |

---

## 20. FINAL REPORT

### What Changes

| Layer | Change |
|-------|--------|
| **Frontend routing** | Wouter → Inertia.js (`@inertiajs/react`) |
| **Frontend data flow** | `mock-data.ts` → `usePage().props` |
| **Frontend state** | `useState` → Inertia server-backed props |
| **Frontend files** | `App.tsx` extracted to `Layouts/AppLayout.tsx` + `Pages/*` |
| **URLs** | `?id=` query strings → slug-based paths |
| **Meta tags** | Static → dynamic per-route |
| **Structured data** | None → JSON-LD (Product, Breadcrumb, Article) |
| **HTTP status** | All 200 → proper 200/404 |
| **Sitemap** | None → auto-generated XML |
| **Backend** | Express stub → Laravel 11 + Inertia |
| **Admin** | Mock dashboard → Filament |
| **Database** | None → MySQL 8.0 with 20+ tables |

### What Stays Identical

| Element | Status |
|---------|--------|
| Tailwind CSS v4 design system | ✅ Unchanged |
| `index.css` (HSL vars, keyframes) | ✅ Unchanged |
| All 55 Radix UI components | ✅ Unchanged |
| Product card design | ✅ Unchanged |
| Header / Footer / BottomNav | ✅ Unchanged |
| Mobile layout & responsive | ✅ Unchanged |
| Animations (Framer Motion) | ✅ Unchanged |
| Colors, typography, spacing | ✅ Unchanged |
| User interaction flows | ✅ Unchanged |
| Cart / checkout UX | ✅ Visually identical |

### Exact Frontend Files Changing

**Modified (4 files):**
1. `artifacts/electronics-store/src/App.tsx` — extract layout, remove routing
2. `artifacts/electronics-store/src/main.tsx` — Inertia root
3. `artifacts/electronics-store/vite.config.ts` — path updates
4. `artifacts/electronics-store/index.html` — entry point update

**Deleted (1 file):**
1. `artifacts/electronics-store/src/data/mock-data.ts` — replaced by Laravel

**New (12+ files):**
1. `resources/js/app.tsx` — Inertia root
2. `resources/js/types/page.ts` — PageProps types
3. `resources/js/Components/SeoHead.tsx` — dynamic meta
4. `resources/js/Layouts/AppLayout.tsx` — extracted layout
5. `resources/js/Pages/Home/index.tsx`
6. `resources/js/Pages/Products/index.tsx`
7. `resources/js/Pages/Products/Show.tsx`
8. `resources/js/Pages/Cart/index.tsx`
9. `resources/js/Pages/Checkout/index.tsx`
10. `resources/js/Pages/Account/index.tsx`
11. `resources/js/Pages/News/index.tsx`
12. `resources/js/Pages/News/Show.tsx`
13. `resources/js/Pages/Compare/index.tsx`

### Exact Phase 0–2 Laravel Files Created

**Storefront core:** `app/Http/Middleware/HandleInertiaRequests.php`, `app/Http/Controllers/{Product,Category,Brand,Article}Controller.php`, `app/Models/{Category,Brand,Product,ProductImage,Specification,Article}.php`, `routes/web.php`, `resources/views/app.blade.php`.

**React/Inertia:** `resources/js/{app,ssr}.tsx`, `resources/js/pages.ts`, `resources/js/Components/SeoHead.tsx`, `resources/js/Layouts/StoreLayout.tsx`, `resources/js/Pages/Home.tsx`, `resources/js/Pages/Products/Show.tsx`, `resources/js/Pages/Categories/Show.tsx`, `resources/js/Pages/Brands/Show.tsx`, `resources/js/Pages/Articles/Show.tsx`, and `resources/css/app.css`.

**Database/testing:** business migrations, `database/seeders/CatalogSeeder.php`, updated `DatabaseSeeder.php`, `tests/Feature/ProductPageTest.php`, and `tests/Feature/CategoryPageTest.php`. API resources, Filament files, and Merchant Center feed files are not yet created.

### Category vertical slice completed

- `CategoryController` now provides the `/dieu-hoa` catalog query, validated server-side filters, sorting, pagination, SEO policy, breadcrumb data, and collection JSON-LD from Eloquent data.
- `Pages/Categories/Show.tsx` now renders the approved catalog visual language with responsive cards, desktop/mobile filters, crawlable GET forms, clean query strings, internal brand/product links, pagination, and useful category copy.
- `SeoHead.tsx` supports robots, Open Graph type/overrides, and Twitter fallbacks. Product SEO props were aligned with this reusable contract.
- `SitemapController`, `resources/views/sitemap.blade.php`, `/sitemap.xml`, and dynamic `/robots.txt` are implemented. The former static robots file was removed to avoid duplicate behavior.
- Homepage Organization JSON-LD and an explicit client hydration marker/error path were added.
- Canonical override columns are nullable and unique for products, categories, brands, and articles.

### Verified behavior

- Production Vite client and SSR builds: passed.
- Clean migration and catalog seed: passed (SQLite test environment).
- Automated suite: 9 tests, 74 assertions, all passed.
- Raw `/dieu-hoa` HTTP response: HTTP 200 with H1/content, title, description, canonical, social metadata, `BreadcrumbList`, and `CollectionPage` JSON-LD.
- Faceted category response: `noindex,follow`, base category canonical, and server-filtered results.
- Browser hydration, Inertia navigation, desktop layout, 390×844 mobile layout, mobile filter drawer, and clean `/dieu-hoa?brand=daikin` filtering: passed without console warnings/errors.
- Unknown category/product/brand routes: proper HTTP 404.

### Current constraints and next boundary

Host runtime vẫn là PHP 8.2.12, nhưng Docker development runtime hiện dùng PHP 8.3 và MySQL 8.0.46 đúng target production. Migrations và seed đã được xác minh trên MySQL. Filament vẫn chủ ý trì hoãn; cart, checkout, orders, full admin và Merchant Center chưa được triển khai.

**Remaining estimate after Phase 0–2: 16–22 working days**, subject to payment/shipping integrations and content volume.

---

*Architecture revised 2026-08-16; product foundation and category vertical slice verified 2026-08-21. Stopped before the next slice as required.*

## Phase 3 domain/database checkpoint — 2026-08-21

Customer and commerce migrations are now hardened for the upcoming auth/cart/checkout slices. The domain includes typed Eloquent models for addresses, carts, wishlists, reviews, promotions, coupons/redemptions, orders/items, payments, shipments, installations, and settings. Orders now retain immutable commercial/address snapshots and an idempotency key; promotion scopes and coupon usage ledger are represented explicitly.

Verification passed with migration rollback/forward plus seed, 14 tests/93 assertions, Pint, and production client/SSR builds. The local machine has PHP 8.2.12 and SQLite but no MySQL client/service, so MySQL 8 compatibility remains a release gate rather than a claimed result. Inventory reservation schema remains pending the business decision on when stock is held or decremented.

## Phase 4 public catalog/content checkpoint — 2026-08-21

The public read vertical is now generalized across the approved top-level category taxonomy. Product URLs use `/{category-slug}/{product-slug}` and Laravel returns 404 when a product is requested under the wrong category. Brand pages, article listing/detail, search results and throttled search suggestions are backed by active/published Eloquent records. Search and faceted pages are `noindex,follow`; canonical categories, brands, products and articles are included in the dynamic sitemap.

The header now exposes crawlable internal links and a functional GET search form without redesigning the approved visual language. Article pages emit Article and Breadcrumb JSON-LD from visible database content. Verification passed with 21 tests/269 assertions, production client/SSR builds, raw initial-HTML checks, and browser hydration/navigation checks at desktop and mobile sizes with no console errors. Authentication/cart and later commerce phases remain untouched.

## Docker and Phase 5 authentication checkpoint — 2026-08-21

Development hiện chạy qua Docker Compose với các service `app`, `ssr`, `mysql`, `redis`, `queue`, `scheduler`. App và worker dùng PHP 8.3 image; session/cache/queue dùng Redis; Inertia SSR chạy độc lập bằng Node và được Laravel gọi nội bộ. MySQL health check có start period đủ cho lần khởi tạo volume đầu tiên.

Storefront dùng Laravel session authentication same-origin, không thêm token API hoặc Sanctum khi chưa có external client. Các route công khai auth dùng slug tiếng Việt; account/address routes được bảo vệ bởi `auth`, ownership policy và CSRF web middleware. Email verification và password reset dùng notification/broker chuẩn của Laravel. Shared Inertia props chỉ chứa user allowlist.

React thêm các trang Login, Register, Forgot/Reset Password, Verify Email và Account nhưng tiếp tục dùng `StoreLayout`, màu sắc và Tailwind design system hiện có. Account/private pages phát `noindex,nofollow`. Tổng kiểm thử hiện là 26 test/311 assertions; MySQL migrate/seed, Pint, TypeScript và cả client/SSR production build đều đạt. Phase 6 cart/wishlist là ranh giới tiếp theo.

## Phase 6 cart and wishlist checkpoint — 2026-08-21

Cart là database-authoritative cho cả guest và authenticated user. Guest browser chỉ giữ UUID bằng encrypted HttpOnly cookie; Laravel dùng token này để tìm active cart. Auth cart gắn `user_id`; login merge guest cart vào user cart trong transaction và clamp quantity theo stock. React không gửi hoặc quyết định giá, subtotal hiển thị luôn được dựng lại từ Eloquent product hiện hành.

Các mutation cart dùng same-origin web routes có CSRF và throttle. Ownership được giải quyết qua session user hoặc guest token; foreign cart item trả 404. Wishlist chỉ dành cho authenticated user, add idempotent dựa trên unique `(user_id, product_id)`, và account listing user-scoped. Header badge và nút hiện hữu trên catalog/product pages đã nối với backend mà không thay đổi visual system.

`/gio-hang` và `/tai-khoan/yeu-thich` là private/noindex surfaces; robots đã dùng đúng route taxonomy tiếng Việt. Verification đạt 32 tests/361 assertions, TypeScript, Pint, client/SSR build, Docker MySQL/Redis và browser desktop/mobile. Pricing, promotions, coupon, shipping/installation quote và checkout vẫn chưa được triển khai.

## Phase 7 pricing and quote checkpoint — 2026-08-21

Cart và pre-checkout validation hiện dùng chung `PricingService` làm nguồn tính tiền duy nhất. Mọi amount dùng integer VND và làm tròn half-up. Giá được dựng lại từ Eloquent theo thứ tự product subtotal, promotion, coupon, shipping, installation; client totals không tham gia phép tính. Promotion hỗ trợ scope product/category/brand, priority và stacking; coupon hỗ trợ active window, minimum order, global/per-user limit và maximum discount.

Shipping và installation là rule cấu hình qua `config/commerce.php` cùng bảng `settings`, chưa phải tích hợp provider. Quote chỉ kiểm tra coupon, không consume usage. Việc lock stock, consume coupon, snapshot giá/địa chỉ và tạo order idempotent vẫn thuộc Phase 8 và phải diễn ra trong database transaction.

UI cart hiện hiển thị breakdown đầy đủ, áp/xóa coupon và tính phí theo thành phố; product detail có thể truyền lựa chọn lắp đặt. `POST /api/v1/checkout/validate` trả server-authoritative quote nhưng không tạo order. Verification đạt 39 tests/385 assertions, Pint, TypeScript, client/SSR build, Docker health và browser responsive. Nút thanh toán vẫn chủ ý bị khóa để giữ đúng ranh giới Phase 7.

## Phase 8 checkout and order checkpoint — 2026-08-21

Checkout hiện dùng Laravel web controller + Inertia props tại `/thanh-toan`; không tạo duplicate REST checkout architecture. `CheckoutService` chạy transaction với row locks cho cart/items/products/coupon, gọi lại `PricingService`, decrement stock, snapshot dữ liệu thương mại và tạo order/items/payment pending/shipment/installation/redemption atomically. Client totals không được đọc.

Order idempotency dùng UUID unique. `OrderPlaced` chỉ dispatch sau commit. `OrderStatusService` kiểm soát transition và hoàn tồn/coupon đúng một lần khi cancelled/failed, được đánh dấu bằng release timestamps. Guest order được bảo vệ theo session; account order được bảo vệ theo `user_id`. Order confirmation và account order list là private `noindex,nofollow` pages.

Automated verification đạt 45 tests/417 assertions cùng TypeScript, Pint và client/SSR production build. Docker storefront được rebuild và chạy trên PHP 8.3/MySQL 8/Redis. Payment/shipping/installation provider integration vẫn thuộc Phase 9.

Browser QA đã hoàn tất luồng guest trên MySQL từ add-to-cart đến confirmation, bao gồm checkout SSR/noindex, shipping re-quote, desktop/mobile responsive và order pending thực tế. Đơn QA development là `DM-20260821-KZM2EAS4`.

## Phase 9 provider integration checkpoint — 2026-08-21

Payment, shipment và notification hiện đi qua contracts/provider managers. Manual COD/bank-transfer và manual shipping là baseline không gọi dịch vụ ngoài; mọi provider job được enqueue sau commit, unique, retry/backoff và lưu failure cho vận hành. Webhook payment/shipping dùng HMAC timestamped raw-body signature, replay/event uniqueness, payload hash conflict detection và redacted audit records.

Payment/shipment/installation có status services riêng; shipping provider status có thể advance order qua `OrderStatusService`, còn payment failure không làm mất đơn. Email notification queued nằm sau `CustomerNotifier`, cho phép thêm SMS adapter sau này. Secrets chỉ đến từ environment và webhook fail-closed khi chưa cấu hình.

Verification đạt 51 tests/446 assertions, TypeScript, Pint và client/SSR production build. Không có claim tích hợp VNPay/MoMo/GHN/GHTK khi chưa có sandbox account/credentials.

Provider foundation migration đã chạy trên MySQL 8. Docker app, queue, scheduler, SSR, Redis và MySQL hoạt động; storefront vẫn SSR HTTP 200. Local webhook secrets được để trống có chủ ý và endpoint trả HTTP 503 fail-closed cho đến khi operator cấu hình environment.

## Phase 10 Filament + Home data checkpoint — 2026-08-21

Filament 4.12 được cài tại `/admin` trên Laravel 11/PHP 8.3. Chỉ user `role=admin` có email đã xác minh được truy cập. Panel có 16 resources cho users, addresses, catalog, content, promotions, orders, providers và settings; dashboard hiển thị revenue, orders, customers, products/low-stock và recent orders. Order resource được giữ read-only để không sửa trực tiếp commercial totals.

Home không còn là placeholder: `HomeController` cấp Eloquent props cho hero, 8 categories, flash sale, best sellers, bốn product groups, 10 brands và articles. Seed idempotent hiện có 35 products, 10 brands, 8 categories, 4 articles và demo commerce local/testing cho user/address/cart/wishlist/pending review/order/item/payment/shipment/installation/coupon redemption. Không seed cache/session/jobs hoặc fake approved review/rating.

Composer platform được khóa PHP 8.3 và Symfony 7.4. Raw `/` chứa title/meta/canonical/Open Graph cùng H1, sections và product content từ Inertia SSR. Browser QA desktop xác nhận 39 cards, trang cao khoảng 6105 px và không có console error.
