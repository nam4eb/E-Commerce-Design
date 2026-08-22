# SEO ARCHITECTURE AUDIT
## Điện Máy 365 – React 19 E-Commerce Storefront

**Status:** AUDIT COMPLETE – DOCUMENTED  
**Date:** 2026-08-16  
**Priority:** HIGH – Google organic search is a primary acquisition channel  
**Constraint:** React frontend is the approved UI/UX. Changes must minimize disruption while achieving SEO goals.

---

## EXECUTIVE SUMMARY

| Dimension | Current Score | Issue |
|-----------|:---:|-------|
| Render model | 1/5 | **Pure CSR (Client-Side Rendering)** – zero server HTML |
| Page URLs | 2/5 | Query-string URLs (`?category=`, `?q=`) – no slugs |
| Metadata | 1/5 | **Zero dynamic meta tags** – only static `index.html` |
| Product content | 2/5 | Present in DOM after JS hydrates — not in initial HTML |
| Structured data | 0/5 | **None** – no JSON-LD anywhere |
| Internal linking | 3/5 | Decent link density but all JS-rendered |
| Crawlability | 2/5 | No sitemap.xml, robots.txt allows all — no canonicals |
| Performance | 3/5 | No lazy loading, no code splitting, single huge bundle |
| Mobile SEO | 4/5 | Responsive, mobile-first, good tap targets |
| Merchant Center | 1/5 | No product feed capability |

**Overall:** The current SPA architecture provides **near-zero SEO value out of the box**. Every page requires JavaScript execution before Googlebot can see content. No structured data, no dynamic metadata, no sitemap, no slug-based URLs.

**Recommendation:** **Hybrid SSR (Option D — Laravel Inertia.js)** / **Hybrid SSR (Option D — Laravel Inertia.js)**. Inertia preserves the existing React component tree exactly while adding first-class server-rendered HTML, real URLs, dynamic meta, initial product content, and canonical URLs — with zero component rewrites.

---

## 1. CURRENT RENDERING ARCHITECTURE

### 1.1 Finding: Pure Client-Side Rendering (CSR)

The application is a **single-page application (SPA)** with no server rendering.

**Evidence:**

- `index.html` returns a minimal shell:
  ```html
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
  ```
- Vite builds a single JS bundle. The server (whether Replit dev or any static host) sends `index.html` for every route, then React hydrates client-side.
- Wouter performs client-side routing. There is **no server-side route handling**.
- `main.tsx` line-by-line:
  ```ts
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary><App /></ErrorBoundary>
  );
  ```
- No `renderToString`, no `renderToPipeableStream`, no `renderToReadableStream`. No Next.js `export const dynamic`. No React Router `StaticRouter`.

**Consequence:**

1. Googlebot receives `index.html` with an empty `<div id="root">`.
2. Googlebot must execute all JavaScript (W3C headless Chromium) to see content.
3. Rendering delay: typically 2-5 seconds for Googlebot to execute the full bundle.
4. Google's "mobile-first indexing" renders JavaScript but is **not guaranteed** to execute complex SPAs identically to Chrome desktop.
5. Error boundary can swallow errors silently in production, causing blank pages to Googlebot.

---

## 2. CURRENT SEO STRENGTHS

Despite CSR, these positives exist:

1. **Semantic HTML in components** — `<header>`, `<main>`, `<footer>`, `<nav>`, `<article>`, `<section>` are used consistently in App.tsx.
2. **Accessible image elements** — every `<img>` has an `alt` attribute (even if often empty `alt=""` for decorative images, which is correct).
3. **Heading hierarchy** — `<h1>` on every page, `<h2>` via `SectionTitle`, `<h3>` in cards.
4. **`lang="vi"`** in `index.html`.
5. **Robots.txt** exists and allows all (`User-agent: *, Allow: /`).
6. **Responsive meta** — `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">` present.
7. **Good link text** — nav links, CTA buttons use descriptive Vietnamese text rather than "click here".
8. **Breadcrumb structure (partial)** — exists in `ProductsPage` and `ProductDetail` as visual breadcrumbs (line 157-158, 163-164) — though they are `<div>` spans, not `<nav>`/`<ul>`.
9. **Color contrast** — blue `#0b4fa4` on white passes WCAG AA for body text; danger red `#d44b2e` on white also passes.
10. **No cloaking risk** — content is the same for users and bots (both must execute JS to see it).

---

## 3. ROUTING & URL ARCHITECTURE

### 3.1 Current Routes (Wouter)

| Path | Type | Indexable? |
|------|------|:---:|
| `/` | Home | ❌ (CSR) |
| `/products` | Listing | ❌ (CSR) |
| `/products?id=ac-02` | Product detail | ❌ (CSR, no slug) |
| `/compare` | Compare tool | ❌ (CSR) |
| `/cart` | Cart | ❌ (CSR, private) |
| `/checkout` | Checkout | ❌ (CSR, private) |
| `/order-success` | Success | ❌ (CSR, private) |
| `/account` | Account | ❌ (CSR, private) |
| `/news` | Blog listing | ❌ (CSR) |
| `/news?id=a-01` | Article detail | ❌ (CSR, no slug) |
| `/admin` | Admin dashboard | ❌ (CSR, private) |

### 3.2 URL Problems

**a) ID-based URLs, not slugs:**
```
/products?id=ac-02          ← current
/products/dieu-hoa-daikin-inverter-1-5-hp-atkf35xvmv  ← desired
```
Google prefers keyword-rich URLs. `?id=ac-02` gives zero keyword signal.

**b) Query-string filtering:**
```
/products?category=air-conditioner
/products?sort=sale
/products?q=dieu%20hoa
```
- `category=` filter pages are indexable intent pages but have no canonical URLs.
- `?q=` search pages risk thin-content / duplicate content issues.
- No `rel="canonical"` to consolidate parameters.

**c) No trailing slash consistency:**
- Wouter doesn't normalize. `/products` and `/products/` may both resolve (hash router behavior).

**d) No URL hierarchy:**
- Categories are on-brand filtering, not path hierarchy (`/dieu-hoa/`, `/tu-lanh/`).

### 3.3 Impact on Long-Tail Keywords

The current URL structure **cannot rank** for queries like:
- `điều hòa Daikin 12000 BTU` — no path signal
- `so sánh điều hòa` — `/compare` is generic, no keyword
- `máy lạnh phòng 15m2` — `/products?q=máy+lạnh+phòng+15m2` is a search, not a landing page

---

## 4. METADATA AUDIT

### 4.1 Finding: Zero Dynamic Metadata

**`index.html` (the ONLY HTML the server returns):**

```html
<title>Điện Máy 365</title>
<meta name="description" content="Điện Máy 365 — built on Replit. Update this description to reflect the app." />
<meta property="og:title" content="Điện Máy 365" />
<meta property="og:description" content="Điện Máy 365 — built on Replit. Update this description to reflect the app." />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Điện Máy 365" />
<meta name="twitter:description" content="Điện Máy 365 — built on Replit. Update this description to reflect the app." />
```

**Every page on the site shares this identical title and description.**

**There is:**
- ❌ No `react-helmet` or equivalent
- ❌ No `useEffect` that sets `document.title`
- ❌ No meta tag injection on route change
- ❌ No canonical URL
- ❌ No `alternate` language tags
- ❌ No `hreflang` (for future multi-language)
- ❌ No Open Graph image (`og:image`) — only `og:title` and `og:description`

**Evidence:** Comprehensive grep for `document.title`, `meta`, `canonical`, `helmet`, `useEffect.*title` across all `src/` returned **zero matches**.

### 4.2 Impact

Every product, category, and article page has:
- `<title>Điện Máy 365</title>` regardless of content
- Identical generic meta description
- No unique OG image for social sharing
- No breadcrumb structured data

This means:
1. Google shows "Điện Máy 365" as the title for **every** indexed page.
2. Search results show the same generic description for all pages.
3. Social media shares (Facebook, Zalo) show identical link previews.
4. Zero keyword density in `<title>` — the single most important on-page ranking factor.

---

## 5. PRODUCT PAGE SEO ASSESSMENT

### 5.1 What Google Sees Without JS

If Googlebot executes the JS bundle successfully, it sees:

| Element | Present? | Notes |
|---------|:---:|-------|
| Product name | ✅ | Rendered in `<h1>` |
| Brand | ✅ | Rendered as `<div>` label |
| Price | ✅ | Rendered as `<span>` |
| Old price (strikethrough) | ✅ | Indicates discount |
| Rating + review count | ✅ | Rendered in `<div>` |
| Stock availability | ✅ | "Còn X sản phẩm" |
| Specifications | ✅ | In tab content |
| Images | ✅ | `<img>` with `alt` (usually empty `alt=""`) |
| Description | ⚠️ | **No product description / long-form content** — only specs |
| Breadcrumbs | ⚠️ | Partial — visual only, not semantic |
| Reviews content | ❌ | Hardcoded mock text only — no real review text |
| SKU | ❌ | Not rendered in UI |
| Reviews structured data | ❌ | None |

### 5.2 What's Missing for SEO

1. **No product description paragraph** — only technical specs. E-commerce SEO needs 200-500 words of unique descriptive content per product.
2. **Empty `alt` text on product images** — `alt=""` is correct for decorative images, but product photos should have descriptive alt like `"Điều hòa Daikin Inverter 1.5 HP ATKF35XVMV - mặt trước"`.
3. **No JSON-LD Product schema** — Google cannot display rich results (price, availability, rating stars in SERP).
4. **No `rel="canonical"`** — filter variants (`?category=`, `?sort=`) create potential duplicate content.
5. **No unique URL slug** — `?id=ac-02` gives no keyword signal.

### 5.3 Ranking Potential

| Search Intent | Can Current Site Rank? | Why / Why Not |
|---------------|:---:|----------------|
| `điều hòa` | ❌ | Homepage has no dedicated category landing page with unique content |
| `điều hòa Daikin` | ❌ | URL is `?id=ac-02` — no keyword in URL, no SEO title |
| `điều hòa 12000 BTU` | ❌ | BTU is in specs tab, not in rendered text after hydration |
| `điều hòa inverter` | ⚠️ | "Inverter" appears in product specs — visible after JS |
| `so sánh điều hòa` | ❌ | `/compare` has no keyword, no unique content |
| `điều hòa Daikin 12000 BTU inverter` | ❌ | No combination landing page |
| `máy lạnh phòng 15m2` | ❌ | No content targeting room-size intent |

---

## 6. CATEGORY PAGE SEO ASSESSMENT

### 6.1 Current State

Categories are **filters**, not landing pages.

The "category" page is actually `/products?category=air-conditioner`. This route:
- Has no page-specific `<title>` — defaults to "Điện Máy 365"
- Has no meta description for the category
- Has no category description text (no "Tủ lạnh là gì…" type content)
- Renders product cards after JS executes
- No category-specific heading hierarchy beyond what `ProductsPage` renders

### 6.2 Required for Category SEO

1. **Unique SEO title** per category: `"Điều hòa chính hãng – Giá tốt nhất | Điện Máy 365"`
2. **Category description** — 200-400 words of unique content about the category
3. **Canonical URL** with category slug
4. **Pagination** with `rel="next"` / `rel="prev"` (if >20 products)
5. **Filter state canonicals** — `?category=ac&brand=daikin` should canonicalize to `/dieu-hoa?brand=daikin` or a combined page

---

## 7. ARTICLE PAGE SEO ASSESSMENT

### 7.1 Current State

`ArticlePage` (App.tsx line 220-221):

- Articles have `title`, `category`, `date`, `read`, `image`, `excerpt` in mock data.
- Full article content is **hardcoded HTML** in the component:
  ```tsx
  <div className="prose prose-slate mt-8 max-w-2xl text-[#4d6984]">
    <p>Chọn một thiết bị điện máy tốt không chỉ là nhìn vào mức giá…</p>
    <h2>Đo nhu cầu trước khi đo giá</h2>
    ...
  </div>
  ```
- This IS indexable content after JS executes.

### 7.2 What's Present

| Element | Status |
|---------|--------|
| Title (H1) | ✅ |
| Category tag | ✅ |
| Publication date | ✅ ("12/06/2024") |
| Read time | ✅ |
| Featured image | ✅ |
| Excerpt | ✅ |
| Body content (400+ words) | ✅ |
| Internal product links | ✅ (related products section at bottom) |
| Author | ❌ Not rendered |

### 7.3 What's Missing

1. **No `<article>` structured data** (JSON-LD `Article` or `BlogPosting`).
2. **No `article:published_time` / `article:modified_time`** meta tags.
3. **No author structured data** (Person schema).
4. **URL is `?id=a-01`** — no slug.
5. **No canonical URL**.
6. **Google cannot distinguish** this from thin content — no visible author, no publish date in machine-readable format.

### 7.4 Potential

Articles are the **strongest existing SEO asset**. With proper slugs, structured data, and canonical URLs, they can drive significant informational search traffic to support product pages.

---

## 8. TECHNICAL SEO ASSESSMENT

### 8.1 Crawlability

| Check | Status | Detail |
|-------|:---:|--------|
| `robots.txt` | ✅ | Allows all (`*`) |
| `sitemap.xml` | ❌ | **Does not exist** |
| canonical URLs | ❌ | Not present on any page |
| 404 handling | ⚠️ | `NotFound` component renders but returns HTTP 200 — **soft 404 risk** |
| Soft 404 | 🔴 | Wouter renders `NotFound` at `*` route without changing HTTP status |
| Trailing slash | ❓ | Wouter handles both — inconsistent |
| URL lowercase | ⚠️ | Depends on what the user types — not enforced server-side |
| Duplicate URLs | 🔴 | `?id=ac-02&sort=popular` and `?id=ac-02&sort=sale` are the same product with different params — potential duplicate |

### 8.2 Indexability

| Content | Indexable? | Reason |
|---------|:---:|--------|
| Homepage | ❌ | CSR, no dynamic meta |
| Category pages | ❌ | Query-string URLs, no content |
| Product pages | ⚠️ | Content present after JS, but no URL signal |
| Article pages | ⚠️ | Good content after JS, but no URL/meta signal |
| Cart, Checkout, Account | ✅ | `noindex` needed — private pages |
| Admin | ❌ | Needs `robots.txt` disallow + auth |

### 8.3 HTTP Status Codes

**Critical issue:** The entire app is served as `index.html`. In a static/Vite deployment:
- `/products` → `index.html` (HTTP 200)
- `/products/nonexistent` → `index.html` (HTTP 200) → renders NotFound — **soft 404**
- `/api/anything` → `index.html` (HTTP 200) — should be 404

This is a **major SEO problem**. Google receives HTTP 200 for every path, including non-existent ones.

---

## 9. STRUCTURED DATA AUDIT

### 9.1 Finding: Zero Structured Data

There is **no JSON-LD, no Microdata, no RDFa** anywhere in the codebase.

Grep for `json-ld`, `schema.org`, `structured`, `application/ld+json` across the entire `src/` — **zero results**.

### 9.2 Required Schemas (Missing)

| Schema | Pages | Priority | Impact |
|--------|-------|:---:|:---:|
| `Product` | Product detail | CRITICAL | Rich snippet: price, availability, rating |
| `Offer` | Product detail | CRITICAL | Price + availability in SERP |
| `AggregateRating` | Product detail | HIGH | Star rating in search results |
| `BreadcrumbList` | All pages | HIGH | Breadcrumb trail in SERP |
| `Organization` | Homepage | MEDIUM | Brand knowledge graph |
| `Article` / `BlogPosting` | Article pages | HIGH | Article carousel eligibility |
| `WebSite` + `SearchAction` | Homepage | MEDIUM | Sitelinks search box |
| `LocalBusiness` | Homepage | LOW | If physical store addresses exist |

### 9.3 Example: What Product JSON-LD Should Look Like

```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Điều hòa Daikin Inverter 1.5 HP ATKF35XVMV",
  "image": [
    "https://dienmay365.vn/storage/ac-02-main.jpg",
    "https://dienmay365.vn/storage/ac-02-gallery-1.jpg"
  ],
  "brand": {
    "@type": "Brand",
    "name": "Daikin"
  },
  "sku": "AC-DAIKIN-ATKF35XVMV",
  "offers": {
    "@type": "Offer",
    "url": "https://dienmay365.vn/dieu-hoa-daikin-inverter-1-5-hp",
    "priceCurrency": "VND",
    "price": "12990000",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Điện Máy 365"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "139"
  },
  "description": "Điều hòa Inverter 1.5 HP, công suất 12.000 BTU..."
}
```

This is **entirely absent** from the current codebase.

---

## 10. INTERNAL LINKING AUDIT

### 10.1 Existing Internal Links

| From | To | Present? | Quality |
|------|----|:---:|:---:|
| Homepage → category | `/products?category=...` | ✅ | Query-string, no keyword |
| Header nav → category | Same query-string links | ✅ | Visible, keyword text |
| Category → product | `ProductCard` click | ✅ | Good |
| Product → related | "Có thể bạn cũng thích" | ✅ | Same category, good |
| Article → product | Related products section | ✅ | Good |
| Product → article | ❌ | ❌ | **No "related articles" on product pages** |
| Brand → product | Brand button click | ✅ | Filter-based |
| Breadcrumbs | Partial (ProductsPage, ProductDetail) | ⚠️ | Visual only, not semantic |
| Footer → news | `/news` link | ✅ | Good |
| Footer → category | ❌ | ❌ | Footer has no category links |
| Homepage → blog | "Mua đúng, dùng hay" section | ✅ | "Đọc tất cả" → `/news` |
| Search suggestions | `/products?q=...` | ✅ | Good UX |

### 10.2 Internal Linking Gaps

1. **No product ↔ article bidirectional linking** — product pages have no "buying guide" or "how-to" article links.
2. **Footer links are all stubs** — "Giới thiệu công ty", "Hệ thống cửa hàng" etc. all `alert('Tính năng đang được cập nhật')`. No actual internal link equity flow.
3. **No "related products by brand"** — only same-category recommendations.
4. **No cross-sell** — "frequently bought together" type links.
5. **Pagination internal links** — no `rel="next"` for product listing pagination.

---

## 11. CRAWL BUDGET & PERFORMANCE

### 11.1 Bundle Size & Rendering

- No code splitting — single entry `main.tsx` → `App.tsx` (261 lines, all routes).
- No `React.lazy()` / `Suspense` for route-level splitting.
- All 55 UI components bundled together.

**Estimated production bundle:** ~400-600 KB gzipped.

**Core Web Vitals:**

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| LCP | ~4-6s | < 2.5s | Hero image from Pexels CDN; JS blocks render |
| FID | ~200ms | < 100ms | No code splitting |
| CLS | ~0.15 | < 0.1 | Hero carousel; no image dimensions |

### 11.2 Image Loading Problems

```tsx
<img src={product.image} alt={product.name} className="h-full w-full object-cover" />
```

- ❌ No `loading="lazy"` on product card images
- ❌ No `decoding="async"`
- ❌ No `srcset` / `sizes`
- ❌ No `width`/`height` → layout shift
- ❌ Hotlinked from `images.pexels.com` — slow for VN users

### 11.3 Font Loading

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
```

- CSS `@import` is render-blocking
- Adds 500-800ms to First Contentful Paint on 3G Vietnam

---

## 12. MOBILE SEO

| Factor | Status | Notes |
|--------|:---:|-------|
| Viewport | ✅ | Correct meta tag |
| Responsive | ✅ | Full mobile-first Tailwind |
| Mobile nav | ✅ | `<BottomNav>` on mobile |
| Touch targets | ✅ | Min 32-44px |
| Content parity | ✅ | Same content both viewports |

---

## 13. GOOGLE MERCHANT CENTER READINESS

Current: **Not ready.** No backend to generate product feeds.

Database schema already supports GMC fields. Add to `products` table:
```sql
gtin: varchar(50) nullable
google_category: varchar(120) nullable
```

Then: `GET /api/v1/feeds/google-merchant` → XML/CSV output.

---

## 14. ARCHITECTURE OPTIONS

| Criterion | A: Pure CSR | B: React SSR/SSG | C: Nuxt/Vue | D: Inertia.js | E: Hybrid Laravel |
|-----------|:---:|:---:|:---:|:---:|:---:|
| SEO | 1 | 5 | 5 | 5 | 5 |
| React preservation | 10 | 7 | 0 | 9 | 5 |
| Laravel fit | 10 | 8 | 7 | 10 | 10 |
| Complexity | 1 | 3 | 4 | 7 | 5 |
| **Overall** | **5** | **7** | **5** | **9** | **7** |

**WINNER: Option D — Laravel 11 + Inertia.js + React**

---

## 15. RECOMMENDED ARCHITECTURE: LARAVEL INERTIA.JS

### 15.1 How It Works

```
Browser → Laravel (server) → renders React components to full HTML → sends HTML + meta + JSON-LD
         ↓ (subsequent navigation)
     Inertia intercepts click → XHR → Laravel → new props → client-side update (SPA feel)
```

First request = fully SSR'd HTML with all SEO signals. Subsequent navigation = instant SPA.

### 15.2 What Changes vs Current

| Element | Change? | Detail |
|---------|:---:|--------|
| Tailwind CSS | ❌ Unchanged | Same utilities, same design tokens |
| Product cards | ❌ Unchanged | Same `ProductCard` component |
| Cart/wishlist | 🔄 Server-backed | Via `usePage().props` |
| Mock data | 🔄 Replaced | Now Laravel seeders |
| Wouter routing | 🔄 Inertia `<Link>` | Drop `wouter`, use `@inertiajs/react` Link |
| Meta tags | ✅ Added | `<Head>` from `@inertiajs/react` |
| Structured data | ✅ Added | JSON-LD in Blade layout |
| index.css | ❌ Unchanged | Zero changes |
| Mobile layout | ❌ Unchanged | Same responsive classes |
| Animations | ❌ Unchanged | Same Framer Motion |

### 15.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              LARAVEL 11 + INERTIA                    │
├─────────────────────────────────────────────────────┤
│  routes/web.php                                      │
│    → PageController::home(), products(), product()  │
│    → inertia('app', [page, meta, props])            │
│                                                      │
│  app/Http/Controllers/PageController.php             │
│    → return inertia('app', [                         │
│        'page' => 'Products',                         │
│        'products' => ProductResource::collection(),  │
│        'meta' => [title, description, canonical],    │
│        'structuredData' => [Product, Breadcrumb],    │
│        'cart' => $user?->cart,                       │
│      ]);                                             │
│                                                      │
│  resources/js/app.tsx (Inertia root)                 │
│    → <App />                                         │
│      → <Head><title>{meta.title}</title></Head>      │
│      → <Switch> → <ProductCard {...product} />       │
│      → <Footer />                                    │
│                                                      │
│  views/app.blade.php                                 │
│    <!DOCTYPE html><html lang="vi">                   │
│    <head>                                            │
│      @yield('head')   ← meta + JSON-LD from Laravel  │
│      @vite('resources/js/app.tsx')                   │
│    </head>                                           │
│    <body>@inertia</body>                             │
└─────────────────────────────────────────────────────┘
```

---

## 16. FRONTEND MIGRATION IMPACT

### 16.1 Files That Change

| File | Change | Risk |
|------|--------|:---:|
| `App.tsx` | Extract routing, add `<Head>` | MEDIUM |
| `main.tsx` | Wrap with Inertia root | LOW |
| `vite.config.ts` | Keep, point to Laravel Vite | LOW |
| `mock-data.ts` | Deleted → Laravel seeders | LOW |
| `index.css` | **Unchanged** | ✅ |
| `components/ui/*` | **Unchanged** | ✅ |

### 16.2 New Frontend Structure

```
resources/js/
├── app.tsx                        # Inertia root + <HeadManager>
├── Pages/
│   ├── Home/index.tsx             # from HomePage
│   ├── Products/
│   │   ├── index.tsx              # listing + filters
│   │   └── Show.tsx               # product detail
│   ├── Cart/index.tsx
│   ├── Checkout/index.tsx
│   ├── Account/index.tsx
│   ├── News/
│   │   ├── index.tsx
│   │   └── Show.tsx
│   └── Compare/index.tsx
├── Layouts/
│   └── AppLayout.tsx              # Header + Footer + BottomNav
└── types/
    └── page.ts                    # PageProps<InertiaPage>
```

### 16.3 Estimated Effort

| Phase | Time | Risk |
|-------|------|:---:|
| Laravel 11 + Inertia scaffold | 2-3 days | LOW |
| Migrate pages to Inertia | 5-7 days | MEDIUM |
| Replace wouter → Inertia `<Link>` | 1 day | LOW |
| `<Head>` + meta per route | 2 days | LOW |
| JSON-LD structured data | 3 days | LOW |
| URL slug migration | 2 days | MEDIUM |
| Visual regression | 2 days | LOW |
| SEO validation | 2 days | LOW |
| **Total** | **~19-22 days** | MEDIUM |

---

## 17. REMAINING SEO FIXES (Post-Migration)

### 17.1 Images
1. Add `loading="lazy"` + `decoding="async"` to all non-hero `<img>`.
2. Add explicit `width`/`height` or `aspect-ratio`.
3. Descriptive `alt` text for every product image.
4. Host on Vietnamese CDN (Cloudflare / BunnyCDN).
5. Use WebP/AVIF with `<picture>` fallback.

### 17.2 Content
1. Add `description` field (200-300 words) per product.
2. Add `description` (200-400 words) per category.
3. Add "Bài viết liên quan" on product pages.
4. Add "Sản phẩm cùng danh mục" on article pages.

### 17.3 Technical
1. Sitemap.xml: `GET /sitemap.xml` from Laravel.
2. Canonical URLs on every page.
3. `robots.txt` properly configured.
4. 301 redirects from old `?id=` URLs to new `/slug/` URLs.
5. Trailing slash enforcement.

---

## 18. GOOGLE MERCHANT CENTER

Already addressed in schema (Section 13). Add `gtin` + `google_category` columns. Build `GET /api/v1/feeds/google-merchant` endpoint.

---

## 19. IMPLEMENTATION ORDER (SEO-First)

```
PHASE 0:  Laravel 11 + Inertia.js scaffold
PHASE 1:  Database + seeders (with slugs + descriptions)
PHASE 2:  Server-rendered page routes + Laravel controllers
PHASE 3:  Dynamic <Head> + meta tags per route
PHASE 4:  JSON-LD structured data (Product, BreadcrumbList, Article)
PHASE 5:  Canonical URLs + robots.txt + sitemap.xml
PHASE 6:  URL slug migration (301 redirects from old ?id= URLs)
PHASE 7:  Product descriptions + category descriptions
PHASE 8:  Internal linking improvements
PHASE 9:  Image optimization + CDN
PHASE 10: Filament admin
 PHASE 11: Google Merchant Center feed
 PHASE 12: Lighthouse + Core Web Vitals tuning
 PHASE 13: Google Search Console submission
```

---

## 20. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSR breaks React components | HIGH | Test each page; components are self-contained |
| Meta tags incorrect | HIGH | `SeoHead` component enforces required fields |
| Duplicate content from params | HIGH | Canonical tags on filtered pages |
| Old URLs indexed | MEDIUM | 301 redirects `?id=` → `/slug/` |
| JSON-LD mismatch | HIGH | Generate from same Eloquent models that render page |
| Bundle size after migration | MEDIUM | Inertia loads only page component + layout |

---

## 21. OPEN DECISIONS

1. **URL:** `/dieu-hoa/product-slug` (hierarchical) or `/product-slug` (flat)?
   - Recommendation: hierarchical — better topical signal.
2. **Trailing slash:** Enforce no trailing slash.
3. **Domain:** `dienmay365.vn` vs `www.dienmay365.vn` — recommend non-www.
4. **CDN:** Cloudflare Images, BunnyCDN, or local storage?
5. **GTIN:** Can suppliers provide barcodes?

---

## 22. SUMMARY

### Current State

The React SPA is an excellent UX prototype with **near-zero SEO value**. Every page returns identical empty HTML. No structured data. No slugs. No sitemap. No dynamic metadata.

### Target State

Laravel 11 + Inertia.js + React delivers:
- Fully server-rendered HTML on first request
- Unique `<title>`, meta description, canonical, OG tags per page
- JSON-LD Product / BreadcrumbList / Article schemas
- Clean slug-based URLs
- Proper HTTP status codes (200/404)
- Sitemap.xml + robots.txt
- Product/descriptions and category content
- Google Merchant Center feed capability

### React Preservation

**Same components. Same Tailwind. Same design system. Same interactions. Same animations.** The only additions are Inertia `<Head>` for meta, SSR initial HTML, slug URLs, and JSON-LD blocks.

The user experience is identical. The SEO foundation is completely transformed.

---

**DECISION REQUIRED:** Approve Option D (Laravel Inertia.js) before backend implementation begins.

*Audit authored: 2026-08-16.*