### 11.1 Bundle Size & Rendering

Current build profile (dev mode, Vite):
- No code splitting — single entry `main.tsx` → `App.tsx` (261 lines, all routes in one file).
- No `React.lazy()` / `Suspense` for route-level splitting.
- All 55 UI components bundled together regardless of page.

**Estimated production bundle:** ~400-600 KB gzipped for JS + CSS.

**Core Web Vitals impact:**

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| LCP | ~4-6s | < 2.5s | Hero image from Pexels CDN; JS blocks render |
| FID | ~200ms | < 100ms | No code splitting |
| CLS | ~0.15 | < 0.1 | Hero carousel transitions; no image dimensions |

### 11.2 Image Loading Problems

```tsx
<img src={product.image} alt={product.name} className="h-full w-full object-cover" />
```

Issues:
- ❌ No `loading="lazy"` on product card images
- ❌ No `decoding="async"`
- ❌ No `srcset` / `sizes`
- ❌ No `width`/`height` → layout shift
- ❌ Images hotlinked from `images.pexels.com` — external dependency, slow for VN users

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
| Touch targets | ✅ | Min 32-44px, close to 48px target |
| Content parity | ✅ | Same content both viewports |
| No AMP | ⚠️ | Not needed in 2024+ |

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
| SEO validation (Lighthouse, Rich Test) | 2 days | LOW |
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
3. Add "Bài viết liên quan" section on product pages.
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