import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, Route, Switch, useLocation, useParams, useSearch } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Eye,
  Facebook,
  Filter,
  Heart,
  Home,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  UserRound,
  Wallet,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { applianceImages, categories, type Product } from "@/data/mock-data";
import { api, readStored, saveStored, type User } from "@/lib/shop-api";
import {
  AccountPage,
  CheckoutPage,
  OrderPage,
  AdminPage,
} from "@/pages/shop-pages";
import {
  Newsletter,
  ContentPage,
  StoresPage,
  SupportPage,
  Reviews,
  ContactLinks,
  CatalogPage,
  NewsArticle,
  PromoSection,
} from "@/pages/store-extras";
let articles: any[] = [];
let products: Product[] = [];

const money = (n: number) => n.toLocaleString("vi-VN") + "₫";
const pct = (n: Product) => Math.round((1 - n.price / n.oldPrice) * 100);
const findProduct = (id?: string) => products.find((item) => item.id === id);

type CartItem = { product: Product; qty: number };
export type StoreContext = {
  user: User | null;
  setUser: (user: User | null) => void;
  catalog: Product[];
  refreshCatalog: () => Promise<void>;
  clearCart: () => void;
  cart: CartItem[];
  wishlist: string[];
  compared: string[];
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  addToCart: (product: Product, qty?: number) => boolean;
  updateQty: (id: string, qty: number) => void;
  removeCart: (id: string) => void;
  openQuickView: (product: Product) => void;
};

function Header({ ctx }: { ctx: StoreContext }) {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = products
    .filter((p) =>
      `${p.name} ${p.brand} ${p.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, 5);
  const submitSearch = () => {
    if (search.trim())
      setLocation(`/products?q=${encodeURIComponent(search.trim())}`);
    else setLocation("/products");
    setFocused(false);
  };
  return (
    <>
      <div className="bg-[#073b86] text-white text-[11px] sm:text-xs">
        <div className="container-store flex h-8 items-center justify-between gap-3">
          <span className="hidden sm:inline">Mua sắm điện máy trực tuyến</span>
          <span className="sm:hidden">Giao hàng và lắp đặt theo đơn</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Trung tâm hỗ trợ</span>
            <span>Hỗ trợ qua tài khoản</span>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-[#dce5ef] bg-white/95 backdrop-blur">
        <div className="container-store flex h-[72px] items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            data-testid="link-logo"
          >
            <span className="grid h-10 w-10 place-items-center bg-[#f6b91a] text-[#073b86]">
              <Zap size={22} fill="currentColor" />
            </span>
            <span className="hidden leading-none sm:block">
              <b className="font-display text-xl tracking-tight text-[#073b86]">
                ĐIỆN MÁY
              </b>
              <br />
              <b className="text-[10px] tracking-[.24em] text-[#f09f14]">365</b>
            </span>
          </Link>
          <button
            className="hidden h-10 items-center gap-2 border border-[#dce5ef] px-3 text-sm font-semibold text-[#173b68] lg:flex"
            onClick={() => setLocation("/products")}
            data-testid="button-category-menu"
          >
            <Menu size={17} /> Danh mục
          </button>
          <div className="relative min-w-0 flex-1">
            <div className="flex h-11 overflow-hidden border-2 border-[#0b4fa4] bg-[#f5f8fc]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                placeholder="Bạn đang tìm gì hôm nay?"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#7b8fa7]"
                data-testid="input-search"
              />
              <button
                className="grid w-12 shrink-0 place-items-center bg-[#0b4fa4] text-white transition hover:bg-[#073b86]"
                onClick={submitSearch}
                data-testid="button-search"
              >
                <Search size={20} />
              </button>
            </div>
            {focused && search && (
              <div className="absolute left-0 right-12 top-12 z-50 border border-[#dce5ef] bg-white p-2 shadow-xl">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8293a8]">
                  Gợi ý tìm kiếm
                </div>
                {suggestions.length ? (
                  suggestions.map((p) => (
                    <button
                      key={p.id}
                      className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-[#f1f6fb]"
                      onClick={() => {
                        setSearch(p.name);
                        setLocation(`/products?q=${p.name}`);
                        setFocused(false);
                      }}
                      data-testid={`suggestion-${p.id}`}
                    >
                      <Search size={14} className="text-[#96a9bd]" />
                      <span className="line-clamp-1">{p.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-3 text-sm text-[#70839a]">
                    Không tìm thấy gợi ý phù hợp
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <HeaderAction
              icon={<Store size={19} />}
              label="Cửa hàng"
              onClick={() => setLocation("/stores")}
              test="button-stores"
            />
            <HeaderAction
              icon={<Heart size={19} />}
              label="Yêu thích"
              count={ctx.wishlist.length || undefined}
              onClick={() => setLocation("/account")}
              test="button-wishlist"
            />
            <HeaderAction
              icon={<ShoppingCart size={19} />}
              label="Giỏ hàng"
              count={ctx.cart.reduce((s, i) => s + i.qty, 0) || undefined}
              onClick={() => setLocation("/cart")}
              test="button-cart"
            />
            <HeaderAction
              icon={<UserRound size={19} />}
              label="Tài khoản"
              onClick={() => setLocation("/account")}
              test="button-account"
            />
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center border border-[#dce5ef] text-[#073b86] md:hidden"
            onClick={() => setLocation("/cart")}
            data-testid="button-mobile-cart"
          >
            <ShoppingCart size={19} />
          </button>
        </div>
        <nav className="hidden border-t border-[#edf1f6] lg:block">
          <div className="container-store flex h-11 items-center gap-7 text-sm font-semibold text-[#36526f]">
            <Link
              href="/products?category=air-conditioner"
              className="flex items-center gap-1 text-[#0b4fa4]"
              data-testid="link-nav-aircon"
            >
              Điều hòa <ChevronDown size={14} />
            </Link>
            <Link
              href="/products?category=refrigerator"
              data-testid="link-nav-fridge"
            >
              Tủ lạnh
            </Link>
            <Link
              href="/products?category=washing-machine"
              data-testid="link-nav-washer"
            >
              Máy giặt
            </Link>
            <Link
              href="/products?category=television"
              data-testid="link-nav-tv"
            >
              Tivi
            </Link>
            <Link
              href="/products?category=kitchen"
              data-testid="link-nav-kitchen"
            >
              Nhà bếp
            </Link>
            <Link
              href="/products?sort=sale"
              className="text-[#c84b25]"
              data-testid="link-nav-sale"
            >
              Khuyến mãi
            </Link>
            <Link href="/news" data-testid="link-nav-news">
              Kinh nghiệm hay
            </Link>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-[#71869d]">
              <ShieldCheck size={15} className="text-[#1c8e6f]" /> Kiểm tra
              thông tin và điều kiện sản phẩm
            </span>
          </div>
        </nav>
      </header>
    </>
  );
}

function HeaderAction({
  icon,
  label,
  count,
  onClick,
  test,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  test: string;
}) {
  return (
    <button
      className="relative flex flex-col items-center gap-1 text-[11px] font-medium text-[#48647f] transition hover:text-[#0b4fa4]"
      onClick={onClick}
      data-testid={test}
    >
      {icon}
      <span>{label}</span>
      {count ? (
        <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center bg-[#e55937] px-1 text-[9px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function Footer() {
  return (
    <footer className="mt-16 bg-[#082f69] text-white">
      <div className="container-store grid gap-8 py-10 md:grid-cols-3">
        <div>
          <h2 className="font-bold">ĐIỆN MÁY 365</h2>
          <p>Mua sắm và theo dõi đơn hàng trực tuyến.</p>
          <Link href="/stores" className="mt-4 block">
            Hệ thống cửa hàng
          </Link>
          <Link href="/news" className="mt-3 block">
            Tin tức
          </Link>
          <Link href="/support" className="mt-3 block">
            Hỗ trợ khách hàng
          </Link>
        </div>
        <nav className="space-y-3">
          {Object.entries({
            about: "Giới thiệu",
            shipping: "Giao hàng",
            returns: "Đổi trả",
            warranty: "Bảo hành",
            faq: "Câu hỏi thường gặp",
            privacy: "Quyền riêng tư",
            "data-deletion": "Xóa dữ liệu",
            careers: "Tuyển dụng",
          }).map(([id, label]) => (
            <Link key={id} href={"/pages/" + id} className="block">
              {label}
            </Link>
          ))}
        </nav>
        <Newsletter />
      </div>
      <p className="pb-5 text-center text-sm">
        © {new Date().getFullYear()} Điện Máy 365
      </p>
    </footer>
  );
}

function ProductCard({
  product,
  ctx,
  compact = false,
}: {
  product: Product;
  ctx: StoreContext;
  compact?: boolean;
}) {
  const wished = ctx.wishlist.includes(product.id);
  const compared = ctx.compared.includes(product.id);
  return (
    <article
      className={`group relative flex min-w-0 flex-col border border-[#e1e8f0] bg-white transition hover:-translate-y-0.5 hover:border-[#a8c3df] hover:shadow-[0_10px_26px_rgba(9,55,108,.10)] ${compact ? "" : "fade-up"}`}
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative aspect-[1.12] overflow-hidden bg-[#f5f8fb]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.badge && (
            <span className="w-fit bg-[#e55937] px-2 py-1 text-[10px] font-bold text-white">
              {product.badge}
            </span>
          )}
          <span className="w-fit bg-[#eaf3ff] px-2 py-1 text-[10px] font-semibold text-[#0b4fa4]">
            -{pct(product)}%
          </span>
        </div>
        <button
          className={`absolute right-2 top-2 grid h-8 w-8 place-items-center border bg-white/90 transition ${wished ? "border-[#e55937] text-[#e55937]" : "border-white text-[#657d99] hover:text-[#e55937]"}`}
          onClick={() => ctx.toggleWishlist(product.id)}
          data-testid={`button-wishlist-${product.id}`}
        >
          <Heart size={16} fill={wished ? "currentColor" : "none"} />
        </button>
        <button
          className="absolute bottom-2 right-2 grid h-8 w-8 translate-y-1 place-items-center bg-white/95 text-[#0b4fa4] opacity-0 shadow transition group-hover:translate-y-0 group-hover:opacity-100"
          onClick={() => ctx.openQuickView(product)}
          data-testid={`button-quickview-${product.id}`}
        >
          <Eye size={16} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#8294a9]">
          {product.brand}
        </div>
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-[#183b62] hover:text-[#0b4fa4]"
          data-testid={`link-product-${product.id}`}
        >
          {product.name}
        </Link>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Star size={13} fill="#f2ab18" className="text-[#f2ab18]" />
          <b>{product.rating}</b>
          <span className="text-[#90a0b1]">({product.reviews})</span>
        </div>
        <div className="mt-auto pt-3">
          <div className="text-base font-extrabold text-[#d44b2e]">
            {money(product.price)}
          </div>
          <div className="text-xs text-[#91a0b0] line-through">
            {money(product.oldPrice)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              className={`flex flex-1 items-center justify-center gap-1 border px-2 py-1.5 text-[11px] font-semibold transition ${compared ? "border-[#0b4fa4] bg-[#eaf3ff] text-[#0b4fa4]" : "border-[#d7e2ed] text-[#5e7792] hover:border-[#0b4fa4] hover:text-[#0b4fa4]"}`}
              onClick={() => ctx.toggleCompare(product.id)}
              data-testid={`button-compare-${product.id}`}
            >
              <BarChart3 size={13} /> {compared ? "Đã chọn" : "So sánh"}
            </button>
            <button
              className="grid h-8 w-8 place-items-center bg-[#0b4fa4] text-white transition hover:bg-[#073b86]"
              onClick={() => ctx.addToCart(product)}
              data-testid={`button-add-cart-${product.id}`}
            >
              <ShoppingCart size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-[#c37c0c]">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-2xl font-bold tracking-tight text-[#14385f] sm:text-3xl">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          href="/products"
          className="flex shrink-0 items-center gap-1 text-sm font-bold text-[#0b4fa4]"
          data-testid="link-section-action"
        >
          {action} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

function CategoryIcon({ category }: { category: (typeof categories)[number] }) {
  const Icon =
    category.icon === "snowflake"
      ? Zap
      : category.icon === "refrigerator"
        ? Box
        : category.icon === "waves"
          ? Waves
          : category.icon === "tv"
            ? Eye
            : category.icon === "chef"
              ? Sparkles
              : category.icon === "droplets"
                ? Waves
                : category.icon === "wind"
                  ? Zap
                  : ShoppingCart;
  return <Icon size={24} />;
}

const heroSlides = [
  {
    eyebrow: "MÙA NÓNG, NHÀ MÁT",
    title: "Mát nhà.",
    accent: "Nhẹ ví.",
    suffix: " Sống vui.",
    copy: "Khám phá điều hòa Inverter, so sánh giá và chọn công suất phù hợp với căn phòng.",
    image: applianceImages[0],
    alt: "Không gian phòng khách mát mẻ với điều hòa",
    tag: "Deal hôm nay",
    tagValue: "Giảm đến 25%",
    categoryId: "air-conditioner",
    cta: "Xem điều hòa bán chạy",
  },
  {
    eyebrow: "BẾP GỌN, SỐNG THOẢI MÁI",
    title: "Bếp hiện đại.",
    accent: "Nấu ngon.",
    suffix: " Mỗi ngày.",
    copy: "Thiết bị nhà bếp thông minh giúp việc nấu nướng nhẹ nhàng hơn, ưu đãi đến 20%.",
    image: applianceImages[4],
    alt: "Không gian bếp hiện đại cho gia đình",
    tag: "Bộ sưu tập bếp",
    tagValue: "Ưu đãi đến 20%",
    categoryId: "kitchen",
    cta: "Khám phá nhà bếp",
  },
  {
    eyebrow: "GIẢI TRÍ TẠI GIA",
    title: "Màn hình lớn.",
    accent: "Trải nghiệm.",
    suffix: " Trọn vẹn.",
    copy: "Smart TV 4K chính hãng cho những buổi xem phim đã mắt, âm thanh sống động tại nhà.",
    image: applianceImages[3],
    alt: "Không gian giải trí gia đình với tivi màn hình lớn",
    tag: "Smart TV 4K",
    tagValue: "Trả góp 0%",
    categoryId: "television",
    cta: "Xem tivi bán chạy",
  },
] as const;

function HomePage({ ctx }: { ctx: StoreContext }) {
  const [, setLocation] = useLocation();
  const [heroIndex, setHeroIndex] = useState(0);
  const featured = products.filter((p) =>
    ["ac-02", "rf-01", "wm-01", "tv-01", "k-01", "v-01"].includes(p.id),
  );
  const slide = heroSlides[heroIndex];
  const categoryRows = [
    {
      id: "refrigerator",
      eyebrow: "BẢO QUẢN TƯƠI NGON",
      title: "Tủ lạnh cho căn bếp hiện đại",
      description:
        "Không gian rộng rãi, vận hành tiết kiệm và bảo quản thực phẩm lâu hơn.",
    },
    {
      id: "washing-machine",
      eyebrow: "CHĂM SÓC TỪNG SỢI VẢI",
      title: "Máy giặt được yêu thích",
      description:
        "Chọn nhanh những model bán chạy với công nghệ giặt sạch, êm và tiết kiệm.",
    },
    {
      id: "television",
      eyebrow: "GIẢI TRÍ TẠI GIA",
      title: "Tivi nâng tầm phòng khách",
      description:
        "Hình ảnh sắc nét, âm thanh sống động cho những phút thư giãn trọn vẹn.",
    },
    {
      id: "kitchen",
      eyebrow: "GIAN BẾP THÔNG MINH",
      title: "Thiết bị nhà bếp tiện nghi",
      description:
        "Từ nồi chiên, bếp từ đến máy rửa bát, mọi việc bếp núc nhẹ nhàng hơn.",
    },
  ] as const;
  useEffect(() => {
    const timer = window.setInterval(
      () => setHeroIndex((current) => (current + 1) % heroSlides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <main>
      <section className="bg-[#eaf3ff]" aria-label="Khuyến mãi nổi bật">
        <div className="container-store grid min-h-[380px] items-center gap-8 py-10 md:grid-cols-[1.03fr_.97fr] md:py-14">
          <div
            className="fade-up"
            key={`hero-copy-${heroIndex}`}
            aria-live="polite"
          >
            <div className="mb-4 inline-flex items-center gap-2 bg-[#d7e9ff] px-3 py-1.5 text-xs font-bold text-[#0b4fa4]">
              <Zap size={14} fill="currentColor" /> {slide.eyebrow}
            </div>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-[1.03] tracking-[-.04em] text-[#0a356d] sm:text-6xl">
              {slide.title}
              <br />
              <span className="text-[#e29b12]">{slide.accent}</span>
              {slide.suffix}
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#466583]">
              {slide.copy}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/products?category=${slide.categoryId}`}
                className="inline-flex items-center gap-2 bg-[#0b4fa4] px-5 py-3 text-sm font-bold !text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#073b86]"
                style={{ color: "#fff" }}
                data-testid="link-hero-shop"
              >
                {slide.cta} <ArrowRight size={17} />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 border border-[#9dbbda] bg-white/50 px-5 py-3 text-sm font-bold text-[#0b4fa4]"
                data-testid="link-hero-all"
              >
                Khám phá sản phẩm
              </Link>
            </div>
            <div className="mt-8 flex gap-5 text-xs font-semibold text-[#52718f]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#1a8d6d]" /> Chính hãng
                100%
              </span>
              <span className="flex items-center gap-1.5">
                <Truck size={16} className="text-[#1a8d6d]" /> Lắp đặt tận tâm
              </span>
            </div>
          </div>
          <div className="relative flex min-h-[270px] items-center justify-center md:min-h-[330px]">
            <div className="absolute right-4 top-4 h-52 w-52 rounded-full bg-[#cfe3fb] blur-[1px] sm:h-72 sm:w-72"></div>
            <div className="absolute bottom-2 left-6 h-24 w-32 border-b-2 border-l-2 border-[#9cc1e8]"></div>
            <img
              key={`hero-image-${heroIndex}`}
              src={slide.image}
              alt={slide.alt}
              className="hero-carousel-image relative z-10 h-[270px] w-full max-w-[470px] object-cover mix-blend-multiply drop-shadow-2xl sm:h-[330px]"
            />
            <div className="absolute bottom-4 right-3 z-20 bg-white p-3 shadow-xl sm:right-10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8294a9]">
                {slide.tag}
              </div>
              <b className="text-lg text-[#d44b2e]">{slide.tagValue}</b>
            </div>
            <div className="absolute bottom-4 left-8 z-20 flex items-center gap-1.5 sm:left-12">
              <button
                type="button"
                aria-label="Ảnh trước"
                className="grid h-9 w-9 place-items-center border border-[#b7cfe8] bg-white/90 text-[#0b4fa4] transition hover:bg-white"
                onClick={() =>
                  setHeroIndex(
                    (current) =>
                      (current - 1 + heroSlides.length) % heroSlides.length,
                  )
                }
                data-testid="button-hero-prev"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Ảnh tiếp theo"
                className="grid h-9 w-9 place-items-center border border-[#b7cfe8] bg-white/90 text-[#0b4fa4] transition hover:bg-white"
                onClick={() =>
                  setHeroIndex((current) => (current + 1) % heroSlides.length)
                }
                data-testid="button-hero-next"
              >
                <ArrowRight size={16} />
              </button>
              <div
                className="ml-1 flex gap-1.5"
                role="tablist"
                aria-label="Chọn banner"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={heroIndex === 0}
                  aria-label="Banner 1"
                  className={`h-1.5 transition-all ${heroIndex === 0 ? "w-6 bg-[#0b4fa4]" : "w-1.5 bg-[#b7cfe8]"}`}
                  onClick={() => setHeroIndex(0)}
                  data-testid="button-hero-dot-0"
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={heroIndex === 1}
                  aria-label="Banner 2"
                  className={`h-1.5 transition-all ${heroIndex === 1 ? "w-6 bg-[#0b4fa4]" : "w-1.5 bg-[#b7cfe8]"}`}
                  onClick={() => setHeroIndex(1)}
                  data-testid="button-hero-dot-1"
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={heroIndex === 2}
                  aria-label="Banner 3"
                  className={`h-1.5 transition-all ${heroIndex === 2 ? "w-6 bg-[#0b4fa4]" : "w-1.5 bg-[#b7cfe8]"}`}
                  onClick={() => setHeroIndex(2)}
                  data-testid="button-hero-dot-2"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="border-b border-[#e1e8f0] bg-white">
        <div className="container-store grid grid-cols-2 divide-x divide-[#e5ebf2] py-4 sm:grid-cols-4">
          <Trust
            icon={<Truck size={20} />}
            title="Giao nhanh tận nhà"
            sub="Đúng hẹn, đúng phí"
          />
          <Trust
            icon={<Settings size={20} />}
            title="Lắp đặt chuyên nghiệp"
            sub="Kỹ thuật viên 4.9/5"
          />
          <Trust
            icon={<ShieldCheck size={20} />}
            title="Bảo hành chính hãng"
            sub="An tâm sử dụng"
          />
          <Trust
            icon={<CircleHelp size={20} />}
            title="Hỗ trợ 7 ngày/tuần"
            sub="1800 6865 miễn phí"
          />
        </div>
      </div>
      <div className="container-store py-12">
        <SectionTitle eyebrow="Mua sắm theo nhu cầu" title="Bạn đang tìm gì?" />
        <div className="no-scrollbar grid grid-cols-2 gap-3 overflow-x-auto sm:grid-cols-5 lg:grid-cols-10">
          {categories.map((c, i) => (
            <Link
              href={`/products?category=${c.id}`}
              key={c.id}
              className={`group flex min-h-[118px] flex-col items-center justify-center gap-3 border border-[#e1e8f0] bg-white p-3 text-center transition hover:-translate-y-1 hover:border-[#8eb4db] hover:shadow-md ${i > 5 ? "hidden lg:flex" : ""}`}
              data-testid={`link-category-${c.id}`}
            >
              <span className="grid h-12 w-12 place-items-center bg-[#eef5fd] text-[#0b4fa4] transition group-hover:bg-[#d9eaff]">
                <CategoryIcon category={c} />
              </span>
              <span className="text-xs font-bold text-[#335474]">{c.name}</span>
              <span className="text-[10px] text-[#91a0b0]">
                {products.filter((p) => p.categoryId === c.id).length} sản phẩm
              </span>
            </Link>
          ))}
        </div>
      </div>
      <PromoSection
        ctx={ctx}
        renderProduct={(p) => <ProductCard key={p.id} product={p} ctx={ctx} />}
      />
      <div className="container-store py-14">
        <SectionTitle
          eyebrow="Được chọn nhiều nhất"
          title="Sản phẩm bán chạy"
          action="Xem toàn bộ"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products.slice(0, 10).map((p) => (
            <ProductCard key={p.id} product={p} ctx={ctx} />
          ))}
        </div>
      </div>
      <section className="border-y border-[#dce7f2] bg-white py-14">
        <div className="container-store space-y-14">
          {categoryRows.map((row) => {
            const categoryProducts = products
              .filter((product) => product.categoryId === row.id)
              .slice(0, 5);
            return (
              <div key={row.id}>
                <SectionTitle
                  eyebrow={row.eyebrow}
                  title={row.title}
                  action="Xem tất cả"
                />
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p className="max-w-xl text-sm leading-6 text-[#71869d]">
                    {row.description}
                  </p>
                  <Link
                    href={`/products?category=${row.id}`}
                    className="hidden shrink-0 text-sm font-bold text-[#0b4fa4] sm:inline-flex sm:items-center sm:gap-1"
                    data-testid={`link-category-products-${row.id}`}
                  >
                    Khám phá danh mục <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} ctx={ctx} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="border-y border-[#dce7f2] bg-[#f5f9fd] py-12">
        <div className="container-store grid items-center gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#c37c0c]">
              Đối tác tin cậy
            </div>
            <h2 className="font-display text-3xl font-bold text-[#14385f]">
              Thương hiệu
              <br />
              làm nên chất lượng.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#617992]">
              Tất cả sản phẩm đều có nguồn gốc rõ ràng, bảo hành chính hãng và
              đội ngũ kỹ thuật đồng hành.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              "DAIKIN",
              "Panasonic",
              "SAMSUNG",
              "LG",
              "CASPER",
              "TOSHIBA",
              "AQUA",
              "SHARP",
            ].map((brand) => (
              <button
                key={brand}
                className="grid h-20 place-items-center border border-[#dce7f2] bg-white font-display text-lg font-bold tracking-tight text-[#52708d] transition hover:border-[#8eb4db] hover:text-[#0b4fa4]"
                onClick={() => setLocation(`/products?q=${brand}`)}
                data-testid={`button-brand-${brand}`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="container-store py-14">
        <SectionTitle
          eyebrow="Góc Điện Máy 365"
          title="Mua đúng, dùng hay"
          action="Đọc tất cả"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {articles.slice(0, 3).map((a, i) => (
            <Link
              href={`/news/${a.id}`}
              key={a.id}
              className={`group flex gap-4 border-b border-[#dce5ef] pb-4 ${i === 0 ? "md:col-span-2 md:grid md:grid-cols-2 md:border-b-0 md:pb-0" : ""}`}
              data-testid={`link-home-article-${a.id}`}
            >
              <img
                src={a.image}
                alt=""
                className={`h-28 w-36 shrink-0 object-cover grayscale-[15%] transition group-hover:grayscale-0 ${i === 0 ? "md:h-full md:w-full" : ""}`}
              />
              <div className="py-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#c37c0c]">
                  {a.category}
                </div>
                <h3 className="mt-2 line-clamp-2 font-display text-base font-bold leading-5 text-[#173b62] group-hover:text-[#0b4fa4]">
                  {a.title}
                </h3>
                <p className="mt-2 hidden text-xs leading-5 text-[#71869d] sm:block">
                  {a.excerpt}
                </p>
                <div className="mt-3 text-[11px] text-[#8293a8]">
                  {a.date} · {a.read} đọc
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
function Trust({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 first:pl-0 last:pr-0">
      <span className="text-[#0b4fa4]">{icon}</span>
      <div>
        <b className="block text-xs text-[#274b70] sm:text-sm">{title}</b>
        <span className="text-[10px] text-[#8293a8] sm:text-xs">{sub}</span>
      </div>
    </div>
  );
}
function ProductsPage({ ctx }: { ctx: StoreContext }) {
  return (
    <CatalogPage
      ctx={ctx}
      renderProduct={(p) => <ProductCard key={p.id} product={p} ctx={ctx} />}
    />
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-[#b9ccdf] bg-[#f7fafd] p-8 text-center">
      <Search size={38} className="text-[#8da9c5]" />
      <h3 className="mt-4 font-display text-xl font-bold text-[#214665]">
        Chưa có sản phẩm phù hợp
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[#70839a]">
        Thử bỏ bớt bộ lọc hoặc tìm kiếm bằng tên sản phẩm khác.
      </p>
      <button
        onClick={onClear}
        className="mt-5 border border-[#0b4fa4] px-4 py-2 text-sm font-bold text-[#0b4fa4]"
        data-testid="button-empty-clear"
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}

function ProductDetail({ ctx }: { ctx: StoreContext }) {
  const { id } = useParams<{ id: string }>();
  if (!findProduct(id)) return <NotFound />;
  return <ProductDetailContent key={id} ctx={ctx} />;
}
function ProductDetailContent({ ctx }: { ctx: StoreContext }) {
  const { id } = useParams<{ id: string }>();
  const product = findProduct(id)!;
  const [image, setImage] = useState(product.image);
  useEffect(() => {
    const v = readStored<unknown>("shop-viewed", []);
    saveStored(
      "shop-viewed",
      [
        product.id,
        ...(Array.isArray(v)
          ? v.filter((id) => typeof id === "string" && id !== product.id)
          : []),
      ].slice(0, 20),
    );
  }, [product.id]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("specs");
  const [added, setAdded] = useState(false);
  const [, navigate] = useLocation();
  const add = () => {
    const ok = ctx.addToCart(product, qty);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1700);
    }
    return ok;
  };
  return (
    <main className="container-store py-7">
      <div className="mb-5 flex items-center gap-2 text-xs text-[#8293a8]">
        <Link href="/products" data-testid="link-detail-back">
          Sản phẩm
        </Link>
        <ChevronRight size={14} />
        <span>{product.category}</span>
        <ChevronRight size={14} />
        <b className="line-clamp-1 text-[#214665]">{product.name}</b>
      </div>
      <div className="grid gap-9 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-[76px_1fr]">
          <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
            {product.gallery.map((g, i) => (
              <button
                key={g}
                onClick={() => setImage(g)}
                className={`h-16 w-16 shrink-0 overflow-hidden border-2 bg-[#f4f8fc] ${image === g ? "border-[#0b4fa4]" : "border-transparent"}`}
                data-testid={`button-gallery-${i}`}
              >
                <img
                  src={g}
                  alt=""
                  className="h-full w-full object-cover mix-blend-multiply"
                />
              </button>
            ))}
          </div>
          <div className="relative order-1 flex aspect-square items-center justify-center overflow-hidden bg-[#f4f8fc] sm:order-2">
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover mix-blend-multiply transition-transform duration-300 hover:scale-125"
            />
            <span className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/85 px-2 py-1 text-[10px] font-semibold text-[#607991]">
              <Eye size={13} /> Di chuột để phóng to
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-[#8294a9]">
            {product.brand} · {product.category}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-[#14385f] sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-bold">
              <Star size={16} fill="#f2ab18" className="text-[#f2ab18]" />{" "}
              {product.rating}
            </span>
            <span className="text-[#90a0b1]">|</span>
            <span className="text-[#5e7792]">{product.reviews} đánh giá</span>
            <span className="bg-[#edf7f2] px-2 py-1 text-xs font-bold text-[#168265]">
              Thông tin sản phẩm
            </span>
          </div>
          <div className="mt-6 border-y border-[#e1e8f0] py-5">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-extrabold text-[#d44b2e]">
                {money(product.price)}
              </span>
              <span className="text-sm text-[#94a2b0] line-through">
                {money(product.oldPrice)}
              </span>
              <span className="bg-[#fff0e9] px-2 py-1 text-xs font-bold text-[#d44b2e]">
                -{pct(product)}%
              </span>
            </div>
            <p className="mt-2 text-xs text-[#71869d]">
              Giá bán hiện tại · Xem phương thức thanh toán tại bước đặt hàng
            </p>
          </div>
          <div className="mt-5 space-y-3">
            <b className="text-sm text-[#214665]">Điểm nổi bật</b>
            {product.specs.slice(0, 3).map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between border-b border-dashed border-[#e1e8f0] py-2 text-sm"
              >
                <span className="text-[#71869d]">{s.label}</span>
                <b className="text-[#315575]">{s.value}</b>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-semibold text-[#315575]">
              Số lượng
            </span>
            <div className="flex border border-[#d5e1ec]">
              <button
                className="grid h-9 w-9 place-items-center text-[#315575]"
                onClick={() => setQty(Math.max(1, qty - 1))}
                data-testid="button-qty-minus"
              >
                <Minus size={14} />
              </button>
              <span className="grid h-9 w-9 place-items-center text-sm font-bold">
                {qty}
              </span>
              <button
                className="grid h-9 w-9 place-items-center text-[#315575]"
                onClick={() =>
                  setQty(Math.max(1, Math.min(product.stock, 100, qty + 1)))
                }
                data-testid="button-qty-plus"
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="text-xs text-[#168265]">
              Còn {product.stock} sản phẩm
            </span>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-2 border-2 border-[#0b4fa4] py-3 text-sm font-bold text-[#0b4fa4]"
              onClick={add}
              data-testid="button-detail-add-cart"
            >
              <ShoppingCart size={18} />{" "}
              {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
            </button>
            <button
              className="flex-1 bg-[#e65a37] py-3 text-sm font-bold text-white transition hover:bg-[#cb4726]"
              onClick={() => {
                if (add()) navigate("/checkout");
              }}
              data-testid="button-buy-now"
            >
              Mua ngay
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className={`flex flex-1 items-center justify-center gap-2 border py-2 text-xs font-bold ${ctx.compared.includes(product.id) ? "border-[#0b4fa4] bg-[#edf5ff] text-[#0b4fa4]" : "border-[#d5e1ec] text-[#5e7792]"}`}
              onClick={() => ctx.toggleCompare(product.id)}
              data-testid="button-detail-compare"
            >
              <BarChart3 size={14} />{" "}
              {ctx.compared.includes(product.id)
                ? "Đã thêm so sánh"
                : "Thêm vào so sánh"}
            </button>
            <button
              className="flex items-center gap-2 border border-[#d5e1ec] px-4 py-2 text-xs font-bold text-[#5e7792]"
              onClick={() => ctx.toggleWishlist(product.id)}
              data-testid="button-detail-wishlist"
            >
              <Heart
                size={14}
                fill={
                  ctx.wishlist.includes(product.id) ? "currentColor" : "none"
                }
              />{" "}
              Yêu thích
            </button>
          </div>
        </div>
      </div>
      <div className="mt-12 border-y border-[#dce5ef]">
        <div className="flex gap-5 overflow-x-auto">
          {[
            ["specs", "Thông số kỹ thuật"],
            ["delivery", "Giao hàng & lắp đặt"],
            ["warranty", "Bảo hành"],
            ["reviews", `Đánh giá (${product.reviews})`],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`shrink-0 border-b-2 px-1 py-4 text-sm font-bold ${tab === key ? "border-[#0b4fa4] text-[#0b4fa4]" : "border-transparent text-[#71869d]"}`}
              onClick={() => setTab(key)}
              data-testid={`button-detail-tab-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-8 py-7 md:grid-cols-2">
          {tab === "specs" ? (
            <div className="space-y-0">
              {product.specs
                .concat([
                  { label: "Xuất xứ", value: "Chính hãng Việt Nam" },
                  { label: "Tình trạng", value: "Mới 100%" },
                ])
                .map((s) => (
                  <div
                    key={s.label}
                    className="flex border-b border-[#edf1f5] py-3 text-sm"
                  >
                    <span className="w-1/2 text-[#71869d]">{s.label}</span>
                    <b className="text-[#315575]">{s.value}</b>
                  </div>
                ))}
            </div>
          ) : (
            <div className="max-w-xl text-sm leading-7 text-[#5e7792]">
              {tab === "delivery" && (
                <Link href="/pages/shipping" className="underline">
                  Xem phí vận chuyển và dịch vụ lắp đặt. Chi phí được hiển thị
                  trước khi đặt đơn.
                </Link>
              )}
              {tab === "warranty" && (
                <Link href="/pages/warranty" className="underline">
                  Xem chính sách bảo hành và cách liên hệ hỗ trợ cho từng sản
                  phẩm.
                </Link>
              )}
              {tab === "reviews" && <Reviews id={product.id} ctx={ctx} />}
            </div>
          )}
          <div className="bg-[#f4f8fc] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#168265]" />
              <div>
                <b className="text-sm text-[#214665]">Mua hàng an tâm</b>
                <p className="mt-1 text-xs leading-5 text-[#71869d]">
                  Hàng chính hãng, kiểm tra trước khi nhận. Hỗ trợ đổi trả minh
                  bạch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <SectionTitle title="Có thể bạn cũng thích" action="Xem thêm" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {products
            .filter(
              (p) => p.categoryId === product.categoryId && p.id !== product.id,
            )
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} ctx={ctx} />
            ))}
        </div>
      </div>
    </main>
  );
}

function CompareExperience({ ctx }: { ctx: StoreContext }) {
  const selected = ctx.compared
    .map(findProduct)
    .filter((p): p is Product => Boolean(p))
    .slice(0, 4);
  const slots = [
    ...selected,
    ...Array(Math.max(0, 4 - selected.length)).fill(null),
  ];
  const [priority, setPriority] = useState<"balanced" | "price" | "rating">(
    "balanced",
  );
  const priorityOptions = [
    { id: "balanced", label: "Cân bằng", hint: "Giá, đánh giá và ưu đãi" },
    { id: "price", label: "Tiết kiệm nhất", hint: "Ưu tiên giá tốt" },
    { id: "rating", label: "Được yêu thích", hint: "Ưu tiên đánh giá cao" },
  ] as const;
  const score = (product: Product) =>
    priority === "price"
      ? (1 - product.price / 30000000) * 60 + product.rating * 8 + pct(product)
      : priority === "rating"
        ? product.rating * 22 + product.reviews / 100 + pct(product) * 0.35
        : product.rating * 16 +
          pct(product) * 0.65 +
          (product.stock > 0 ? 3 : 0);
  const recommended = selected.length
    ? selected.reduce((best, product) =>
        score(product) > score(best) ? product : best,
      )
    : null;
  const sameCategory =
    selected.length > 1 &&
    selected.every((product) => product.categoryId === selected[0].categoryId);
  const metricRows: {
    key: string;
    label: string;
    get: (product: Product) => string;
    winner?: (product: Product) => boolean;
  }[] = [
    {
      key: "price",
      label: "Giá bán",
      get: (product) => money(product.price),
      winner: (product) =>
        selected.length > 1 &&
        product.price === Math.min(...selected.map((item) => item.price)),
    },
    {
      key: "rating",
      label: "Đánh giá",
      get: (product) => `${product.rating}/5 · ${product.reviews} đánh giá`,
      winner: (product) =>
        selected.length > 1 &&
        product.rating === Math.max(...selected.map((item) => item.rating)),
    },
    {
      key: "discount",
      label: "Mức giảm",
      get: (product) => `-${pct(product)}%`,
      winner: (product) =>
        selected.length > 1 &&
        pct(product) === Math.max(...selected.map((item) => pct(item))),
    },
    { key: "brand", label: "Thương hiệu", get: (product) => product.brand },
    {
      key: "technology",
      label: "Công nghệ nổi bật",
      get: (product) => product.specs[1]?.value || "Đang cập nhật",
    },
    {
      key: "capacity",
      label: "Công suất / kích thước",
      get: (product) => product.specs[0]?.value || "Đang cập nhật",
    },
    {
      key: "stock",
      label: "Tình trạng",
      get: (product) =>
        product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng",
    },
    {
      key: "delivery",
      label: "Giao hàng & lắp đặt",
      get: () => "Miễn phí giao hàng",
    },
  ];
  const suggestions = products
    .filter((product) => !ctx.compared.includes(product.id))
    .slice(0, 4);
  return (
    <main className="container-store py-8 sm:py-10">
      <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-[#c37c0c]">
            Quyết định dễ hơn
          </div>
          <h1 className="font-display text-3xl font-bold text-[#14385f] sm:text-4xl">
            So sánh sản phẩm
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#71869d]">
            Đặt các sản phẩm cạnh nhau để nhìn rõ khác biệt và chọn model phù
            hợp nhất với nhu cầu gia đình.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#607991]">
          <span className="font-bold text-[#0b4fa4]">{selected.length}/4</span>{" "}
          sản phẩm đã chọn
          {selected.length > 0 && (
            <button
              className="ml-2 border border-[#d5e1ec] px-3 py-2 text-xs font-bold text-[#607991] transition hover:border-[#e55937] hover:text-[#e55937]"
              onClick={() =>
                selected.forEach((product) => ctx.toggleCompare(product.id))
              }
              data-testid="button-clear-compare"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {priorityOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`border p-4 text-left transition ${priority === option.id ? "border-[#0b4fa4] bg-[#eaf3ff] shadow-sm" : "border-[#dce5ef] bg-white hover:border-[#9dbbda]"}`}
            onClick={() => setPriority(option.id)}
            data-testid={`button-compare-priority-${option.id}`}
          >
            <span
              className={`block text-sm font-bold ${priority === option.id ? "text-[#0b4fa4]" : "text-[#315575]"}`}
            >
              {option.label}
            </span>
            <span className="mt-1 block text-xs text-[#7b91a7]">
              {option.hint}
            </span>
          </button>
        ))}
      </div>
      {selected.length < 2 ? (
        <div className="border border-[#dce5ef] bg-white p-5 sm:p-8">
          <div className="flex min-h-[210px] flex-col items-center justify-center text-center">
            <BarChart3 size={42} className="text-[#7ea5ca]" />
            <h2 className="mt-4 font-display text-xl font-bold text-[#214665]">
              Bắt đầu bảng so sánh của bạn
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#71869d]">
              Thêm ít nhất 2 sản phẩm từ danh sách hoặc trang chi tiết để xem
              giá, công nghệ, đánh giá và dịch vụ cạnh nhau.
            </p>
            <Link
              href="/products"
              className="mt-5 bg-[#0b4fa4] px-5 py-3 text-sm font-bold text-white"
              data-testid="link-compare-products"
            >
              Chọn sản phẩm
            </Link>
          </div>
          <div className="mt-8 border-t border-[#e5ebf2] pt-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.18em] text-[#c37c0c]">
                  Gợi ý bắt đầu
                </div>
                <h3 className="mt-1 font-display text-xl font-bold text-[#214665]">
                  Thêm sản phẩm để so sánh
                </h3>
              </div>
              <Link
                href="/products"
                className="text-sm font-bold text-[#0b4fa4]"
              >
                Xem danh sách <ArrowRight size={15} className="ml-1 inline" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {suggestions.map((product) => (
                <div key={product.id} className="border border-[#e1e8f0] p-3">
                  <img
                    src={product.image}
                    alt=""
                    className="aspect-[1.2] w-full object-cover mix-blend-multiply"
                  />
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#8294a9]">
                    {product.brand}
                  </div>
                  <div className="mt-1 line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-[#214665]">
                    {product.name}
                  </div>
                  <div className="mt-2 font-extrabold text-[#d44b2e]">
                    {money(product.price)}
                  </div>
                  <button
                    className="mt-3 w-full border border-[#0b4fa4] py-2 text-xs font-bold text-[#0b4fa4] transition hover:bg-[#eaf3ff]"
                    onClick={() => ctx.toggleCompare(product.id)}
                    data-testid={`button-suggest-compare-${product.id}`}
                  >
                    Thêm so sánh
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3 border border-[#cfe0ef] bg-[#f5f9fd] p-4 text-sm text-[#52718f]">
            <Sparkles size={18} className="shrink-0 text-[#c37c0c]" />
            <span>
              {recommended ? (
                <>
                  <b className="text-[#214665]">
                    {recommended.brand} {recommended.name}
                  </b>{" "}
                  đang là lựa chọn{" "}
                  {priority === "price"
                    ? "tiết kiệm nhất"
                    : priority === "rating"
                      ? "được đánh giá cao nhất"
                      : "cân bằng nhất"}{" "}
                  theo tiêu chí bạn chọn.
                </>
              ) : (
                "Chọn tiêu chí để nhận gợi ý phù hợp hơn."
              )}
            </span>
            {!sameCategory && (
              <span className="w-full border-t border-[#dce7f2] pt-3 text-xs text-[#9a6a24]">
                Bạn đang so sánh nhiều nhóm sản phẩm khác nhau. Để kết quả chính
                xác hơn, hãy chọn các sản phẩm cùng danh mục.
              </span>
            )}
          </div>
          <div className="overflow-x-auto border border-[#dce5ef] bg-white">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[170px_repeat(4,minmax(180px,1fr))]">
                {slots.map((product, index) =>
                  product ? (
                    <div
                      key={product.id}
                      className={`relative border-b border-l border-[#e1e8f0] p-4 ${recommended?.id === product.id ? "bg-[#f6fbff]" : ""}`}
                    >
                      <button
                        className="absolute right-3 top-3 text-[#9aa8b8] transition hover:text-[#d44b2e]"
                        onClick={() => ctx.toggleCompare(product.id)}
                        aria-label={`Bỏ ${product.name} khỏi so sánh`}
                        data-testid={`button-remove-compare-${product.id}`}
                      >
                        <X size={15} />
                      </button>
                      {recommended?.id === product.id && (
                        <span className="inline-flex items-center gap-1 bg-[#eaf7f1] px-2 py-1 text-[10px] font-bold text-[#168265]">
                          <Check size={12} /> Gợi ý phù hợp
                        </span>
                      )}
                      <img
                        src={product.image}
                        alt=""
                        className="mx-auto mt-2 aspect-square w-full max-w-[150px] object-cover mix-blend-multiply"
                      />
                      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#8294a9]">
                        {product.brand}
                      </div>
                      <Link
                        href={`/products/${product.id}`}
                        className="mt-1 block line-clamp-2 min-h-[40px] text-sm font-bold leading-5 text-[#214665]"
                        data-testid={`link-compare-product-${product.id}`}
                      >
                        {product.name}
                      </Link>
                      <div className="mt-3 font-extrabold text-[#d44b2e]">
                        {money(product.price)}
                      </div>
                      <button
                        className="mt-3 w-full bg-[#0b4fa4] py-2.5 text-xs font-bold text-white transition hover:bg-[#073b86]"
                        onClick={() => ctx.addToCart(product)}
                        data-testid={`button-compare-cart-${product.id}`}
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                  ) : (
                    <Link
                      key={`empty-${index}`}
                      href="/products"
                      className="flex min-h-[300px] flex-col items-center justify-center border-b border-l border-[#e1e8f0] text-center text-sm text-[#7b91a7] transition hover:bg-[#f5f9fd]"
                      data-testid={`link-compare-empty-${index}`}
                    >
                      <Plus size={22} className="mb-2 text-[#0b4fa4]" />
                      Thêm sản phẩm
                    </Link>
                  ),
                )}
              </div>
              <div className="grid grid-cols-[170px_repeat(4,minmax(180px,1fr))]">
                {metricRows.map((row) => (
                  <React.Fragment key={row.key}>
                    <div className="bg-[#f5f8fc] p-4 text-xs font-bold text-[#607991]">
                      {row.label}
                    </div>
                    {slots.map((product, index) => (
                      <div
                        key={`${row.key}-${index}`}
                        className={`border-l border-t border-[#e1e8f0] p-4 text-sm ${product && row.winner?.(product) ? "bg-[#fff8e8] font-bold text-[#9a6a24]" : "text-[#315575]"}`}
                      >
                        {product ? row.get(product) : "—"}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-[#7b91a7]">
            <span className="h-3 w-3 bg-[#fff8e8]" /> Điểm nổi bật trong từng
            tiêu chí <span className="ml-2 h-3 w-3 bg-[#eaf7f1]" /> Gợi ý tổng
            thể
          </div>
        </>
      )}
    </main>
  );
}

function LegacyComparePage({ ctx }: { ctx: StoreContext }) {
  const selected = ctx.compared
    .map(findProduct)
    .filter((p): p is Product => Boolean(p))
    .slice(0, 4);
  const slots = [
    ...selected,
    ...Array(Math.max(0, 4 - selected.length)).fill(null),
  ];
  return (
    <main className="container-store py-8">
      <div className="mb-7">
        <div className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-[#c37c0c]">
          Quyết định dễ hơn
        </div>
        <h1 className="font-display text-3xl font-bold text-[#14385f] sm:text-4xl">
          So sánh sản phẩm
        </h1>
        <p className="mt-2 text-sm text-[#71869d]">
          Chọn tối đa 4 sản phẩm để xem điểm khác biệt.
        </p>
      </div>
      {selected.length < 2 ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center border border-dashed border-[#b9ccdf] bg-white text-center">
          <BarChart3 size={42} className="text-[#7ea5ca]" />
          <h2 className="mt-4 font-display text-xl font-bold text-[#214665]">
            Bắt đầu bảng so sánh của bạn
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[#71869d]">
            Thêm ít nhất 2 sản phẩm từ danh sách hoặc trang chi tiết.
          </p>
          <Link
            href="/products"
            className="mt-5 bg-[#0b4fa4] px-5 py-3 text-sm font-bold text-white"
            data-testid="link-compare-products"
          >
            Chọn sản phẩm
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#dce5ef] bg-white">
          <div className="grid min-w-[760px] grid-cols-[150px_repeat(4,1fr)]">
            {slots.map((p, i) =>
              p ? (
                <div
                  key={p.id}
                  className="relative border-b border-l border-[#e1e8f0] p-4"
                >
                  <button
                    className="absolute right-2 top-2 text-[#9aa8b8] hover:text-[#d44b2e]"
                    onClick={() => ctx.toggleCompare(p.id)}
                    data-testid={`button-remove-compare-${p.id}`}
                  >
                    <X size={15} />
                  </button>
                  <img
                    src={p.image}
                    alt=""
                    className="mx-auto aspect-square w-full max-w-[150px] object-cover mix-blend-multiply"
                  />
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#8294a9]">
                    {p.brand}
                  </div>
                  <Link
                    href={`/products/${p.id}`}
                    className="mt-1 block line-clamp-2 text-sm font-bold leading-5 text-[#214665]"
                    data-testid={`link-compare-product-${p.id}`}
                  >
                    {p.name}
                  </Link>
                  <div className="mt-3 font-extrabold text-[#d44b2e]">
                    {money(p.price)}
                  </div>
                  <button
                    className="mt-3 w-full bg-[#0b4fa4] py-2 text-xs font-bold text-white"
                    onClick={() => ctx.addToCart(p)}
                    data-testid={`button-compare-cart-${p.id}`}
                  >
                    Thêm vào giỏ
                  </button>
                </div>
              ) : (
                <Link
                  key={`empty-${i}`}
                  href="/products"
                  className="flex min-h-[260px] flex-col items-center justify-center border-b border-l border-[#e1e8f0] text-center text-sm text-[#7b91a7]"
                  data-testid={`link-compare-empty-${i}`}
                >
                  <Plus size={22} className="mb-2 text-[#0b4fa4]" />
                  Thêm sản phẩm
                </Link>
              ),
            )}
            {[
              "Thương hiệu",
              "Đánh giá",
              "Công nghệ",
              "Công suất / kích thước",
              "Bảo hành",
              "Giao hàng",
            ].map((label, row) => (
              <div key={label} className="contents">
                <div className="bg-[#f5f8fc] p-4 text-xs font-bold text-[#607991]">
                  {label}
                </div>
                {slots.map((p, i) => (
                  <div
                    key={`${label}-${i}`}
                    className="border-l border-t border-[#e1e8f0] p-4 text-sm text-[#315575]"
                  >
                    {p ? (
                      label === "Thương hiệu" ? (
                        p.brand
                      ) : label === "Đánh giá" ? (
                        <span className="flex items-center gap-1">
                          <Star
                            size={14}
                            fill="#f2ab18"
                            className="text-[#f2ab18]"
                          />{" "}
                          {p.rating} ({p.reviews})
                        </span>
                      ) : label === "Công nghệ" ? (
                        p.specs[1]?.value
                      ) : label === "Bảo hành" ? (
                        "Theo chính sách từng sản phẩm"
                      ) : label === "Giao hàng" ? (
                        "Theo giá trị đơn"
                      ) : (
                        p.specs[0]?.value
                      )
                    ) : (
                      "—"
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function CartPage({ ctx }: { ctx: StoreContext }) {
  const subtotal = ctx.cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = subtotal >= 10000000 || subtotal === 0 ? 0 : 35000;
  const total = subtotal + shipping;
  return (
    <main className="container-store py-8">
      <div className="mb-7">
        <div className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-[#c37c0c]">
          Kiểm tra lại lựa chọn
        </div>
        <h1 className="font-display text-3xl font-bold text-[#14385f]">
          Giỏ hàng{" "}
          <span className="text-lg font-medium text-[#8293a8]">
            ({ctx.cart.reduce((s, i) => s + i.qty, 0)} sản phẩm)
          </span>
        </h1>
      </div>
      {!ctx.cart.length ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-[#b9ccdf] bg-white text-center">
          <ShoppingCart size={42} className="text-[#7ea5ca]" />
          <h2 className="mt-4 font-display text-xl font-bold text-[#214665]">
            Giỏ hàng đang trống
          </h2>
          <p className="mt-2 text-sm text-[#71869d]">
            Thêm sản phẩm bạn thích để bắt đầu.
          </p>
          <Link
            href="/products"
            className="mt-5 bg-[#0b4fa4] px-5 py-3 text-sm font-bold text-white"
            data-testid="link-empty-cart"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
          <div className="border border-[#dce5ef] bg-white">
            {ctx.cart.map(({ product, qty }) => (
              <div
                key={product.id}
                className="flex gap-3 border-b border-[#e5ebf2] p-4 last:border-b-0 sm:gap-5"
              >
                <img
                  src={product.image}
                  alt=""
                  className="h-24 w-24 shrink-0 object-cover mix-blend-multiply sm:h-32 sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8294a9]">
                    {product.brand}
                  </div>
                  <Link
                    href={`/products/${product.id}`}
                    className="mt-1 block line-clamp-2 text-sm font-bold text-[#214665]"
                    data-testid={`link-cart-product-${product.id}`}
                  >
                    {product.name}
                  </Link>
                  <div className="mt-2 text-base font-extrabold text-[#d44b2e]">
                    {money(product.price)}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex border border-[#d5e1ec]">
                      <button
                        className="grid h-8 w-8 place-items-center"
                        onClick={() => ctx.updateQty(product.id, qty - 1)}
                        data-testid={`button-cart-minus-${product.id}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="grid h-8 w-8 place-items-center text-sm">
                        {qty}
                      </span>
                      <button
                        className="grid h-8 w-8 place-items-center"
                        onClick={() => ctx.updateQty(product.id, qty + 1)}
                        data-testid={`button-cart-plus-${product.id}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs font-semibold text-[#8293a8] hover:text-[#d44b2e]"
                      onClick={() => ctx.removeCart(product.id)}
                      data-testid={`button-remove-cart-${product.id}`}
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <b className="text-base text-[#214665]">
                    {money(product.price * qty)}
                  </b>
                  <div className="mt-2 text-xs text-[#168265]">Còn hàng</div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between bg-[#f5f8fc] p-4 text-sm">
              <Link
                href="/products"
                className="flex items-center gap-1 font-semibold text-[#0b4fa4]"
                data-testid="link-cart-continue"
              >
                <ArrowLeft size={15} /> Tiếp tục mua sắm
              </Link>
              <span className="text-[#71869d]">Đã bao gồm VAT</span>
            </div>
          </div>
          <div className="h-fit border border-[#dce5ef] bg-white p-5">
            <h2 className="font-display text-lg font-bold text-[#214665]">
              Tóm tắt đơn hàng
            </h2>
            <div className="mt-5 space-y-3 border-b border-[#e1e8f0] pb-5 text-sm">
              <div className="flex justify-between text-[#71869d]">
                <span>Tạm tính</span>
                <b className="text-[#315575]">{money(subtotal)}</b>
              </div>
              <div className="flex justify-between text-[#71869d]">
                <span>Phí giao hàng</span>
                <b className="text-[#168265]">
                  {shipping ? money(shipping) : "Miễn phí"}
                </b>
              </div>
              <div className="flex justify-between text-[#71869d]">
                <span>Ưu đãi</span>
                <b className="text-[#d44b2e]">Giá bán hiện tại</b>
              </div>
            </div>
            <div className="flex items-end justify-between py-5">
              <span className="text-sm font-bold text-[#315575]">
                Tổng cộng
              </span>
              <b className="text-2xl text-[#d44b2e]">{money(total)}</b>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-[#e65a37] py-3 text-center text-sm font-bold text-white transition hover:bg-[#cb4726]"
              data-testid="link-checkout"
            >
              Tiến hành đặt hàng{" "}
              <ArrowRight size={16} className="ml-1 inline" />
            </Link>
            <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#71869d]">
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-[#168265]"
              />{" "}
              Thông tin của bạn được bảo mật trong suốt quá trình đặt hàng.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NewsPage() {
  return (
    <main className="container-store py-8">
      <div className="mb-8">
        <div className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-[#c37c0c]">
          Góc tư vấn
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-[#14385f]">
          Mua đúng, dùng hay
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#71869d]">
          Kinh nghiệm chọn mua, sử dụng và bảo quản thiết bị điện máy từ đội ngũ
          Điện Máy 365.
        </p>
      </div>
      <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a, i) => (
          <Link
            href={`/news/${a.id}`}
            key={a.id}
            className={`group ${i === 0 ? "sm:col-span-2 lg:col-span-2" : ""}`}
            data-testid={`link-article-${a.id}`}
          >
            <div className="relative overflow-hidden bg-[#eaf3ff]">
              <img
                src={a.image}
                alt=""
                className={`w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-105 ${i === 0 ? "aspect-[2/1]" : "aspect-[1.5/1]"}`}
              />
              <span className="absolute left-3 top-3 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0b4fa4]">
                {a.category}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-[#8293a8]">
              {a.date} · {a.read} đọc
            </div>
            <h2 className="mt-1 font-display text-lg font-bold leading-6 text-[#214665] group-hover:text-[#0b4fa4]">
              {a.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#71869d]">
              {a.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
function ArticlePage({ ctx }: { ctx: StoreContext }) {
  return <NewsArticle ctx={ctx} />;
}

function QuickViewModal({
  product,
  ctx,
  close,
}: {
  product: Product;
  ctx: StoreContext;
  close: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#102c4b]/45 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-white p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-end">
          <button
            onClick={close}
            className="text-[#8293a8]"
            data-testid="button-close-quickview"
          >
            <X />
          </button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover mix-blend-multiply"
          />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8294a9]">
              {product.brand}
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-[#214665]">
              {product.name}
            </h2>
            <div className="mt-4 text-2xl font-extrabold text-[#d44b2e]">
              {money(product.price)}
            </div>
            <div className="mt-4 space-y-2">
              {product.specs.slice(0, 3).map((s) => (
                <div
                  key={s.label}
                  className="flex justify-between border-b border-dashed border-[#e1e8f0] py-2 text-sm"
                >
                  <span className="text-[#71869d]">{s.label}</span>
                  <b className="text-[#315575]">{s.value}</b>
                </div>
              ))}
            </div>
            <button
              className="mt-6 w-full bg-[#0b4fa4] py-3 text-sm font-bold text-white"
              onClick={() => {
                ctx.addToCart(product);
                close();
              }}
              data-testid={`button-quick-add-${product.id}`}
            >
              Thêm vào giỏ hàng
            </button>
            <Link
              href={`/products/${product.id}`}
              onClick={close}
              className="mt-3 block text-center text-sm font-bold text-[#0b4fa4]"
              data-testid={`link-quick-detail-${product.id}`}
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ ctx }: { ctx: StoreContext }) {
  const [loc] = useLocation();
  const items: {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    href: string;
  }[] = [
    { icon: Home, label: "Trang chủ", href: "/" },
    { icon: Search, label: "Khám phá", href: "/products" },
    { icon: Heart, label: "Yêu thích", href: "/account" },
    { icon: ShoppingCart, label: "Giỏ hàng", href: "/cart" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-[#dce5ef] bg-white/95 py-2 backdrop-blur md:hidden">
      {items.map(({ icon: Icon, label, href }) => (
        <Link
          key={label}
          href={href}
          className={`relative flex flex-col items-center gap-1 text-[10px] font-semibold ${loc === href || (href !== "/" && loc.startsWith(href)) ? "text-[#0b4fa4]" : "text-[#8293a8]"}`}
          data-testid={`bottom-nav-${label}`}
        >
          <Icon size={18} />
          <span>{label}</span>
          {label === "Giỏ hàng" && ctx.cart.length ? (
            <span className="absolute left-1/2 top-0 ml-1 grid h-3 min-w-3 place-items-center bg-[#e55937] px-0.5 text-[8px] text-white">
              {ctx.cart.length}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

type ContactChannel = "hotline" | "ai" | "zalo" | "facebook" | null;

function FloatingContacts() {
  return <ContactLinks />;
}

function NotFound() {
  return (
    <main className="container-store flex min-h-[500px] flex-col items-center justify-center text-center">
      <div className="font-display text-7xl font-bold text-[#c7dcef]">404</div>
      <h1 className="mt-3 font-display text-2xl font-bold text-[#214665]">
        Trang này chưa có
      </h1>
      <Link
        href="/"
        className="mt-5 bg-[#0b4fa4] px-5 py-3 text-sm font-bold text-white"
        data-testid="link-notfound-home"
      >
        Về trang chủ
      </Link>
    </main>
  );
}

function AppShell() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cartIds, setCartIds] = useState<{ id: string; qty: number }[]>(() => {
    const stored = readStored<unknown>("shop-cart", []);
    return Array.isArray(stored)
      ? stored
          .filter(
            (i) =>
              typeof i?.id === "string" &&
              Number.isInteger(i.qty) &&
              i.qty > 0 &&
              i.qty <= 100,
          )
          .slice(0, 100)
          .filter(
            (i, index, all) => all.findIndex((x) => x.id === i.id) === index,
          )
      : [];
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const v = readStored<unknown>("shop-wishlist", []);
    return Array.isArray(v) ? v.filter((i) => typeof i === "string") : [];
  });
  const [compared, setCompared] = useState<string[]>([]);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const refreshCatalog = async () => {
    try {
      const [items, news] = await Promise.all([
        api<Product[]>("/products"),
        api<any[]>("/content/article"),
      ]);
      articles = news.map((a, i) => ({
        ...a,
        image: a.image || applianceImages[i % applianceImages.length],
        excerpt: a.body.slice(0, 150),
        category: a.category || "Kinh nghiệm",
        read: `${Math.max(1, Math.ceil(a.body.split(/\s+/).length / 200))} phút`,
      }));
      products = items;
      setCatalog(items);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Không thể tải sản phẩm");
    }
  };
  const setUser = (value: User | null) => {
    setUserState(value);
    setWishlist(value?.wishlist || []);
  };
  useEffect(() => {
    Promise.all([
      api<Product[]>("/products"),
      api<User | null>("/auth/me"),
      api<any[]>("/content/article"),
    ])
      .then(([items, account, news]) => {
        articles = news.map((a, i) => ({
          ...a,
          image: a.image || applianceImages[i % applianceImages.length],
          excerpt: a.excerpt || a.body.slice(0, 150),
          category: a.category || "Kinh nghiệm",
          read: a.read || "3 phút",
        }));
        products = items;
        setCatalog(items);
        setUserState(account);
        if (account) setWishlist(account.wishlist);
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    saveStored("shop-cart", cartIds);
  }, [cartIds]);
  useEffect(() => {
    saveStored("shop-wishlist", wishlist);
  }, [wishlist]);
  const cart = cartIds.flatMap((item) => {
    const product = catalog.find((p) => p.id === item.id);
    return product ? [{ product, qty: item.qty }] : [];
  });
  const ctx: StoreContext = {
    user,
    setUser,
    catalog,
    refreshCatalog,
    clearCart: () => {
      setCartIds([]);
      saveStored("shop-cart", []);
    },
    cart,
    wishlist,
    compared,
    toggleWishlist: (id) => {
      const next = wishlist.includes(id)
        ? wishlist.filter((x) => x !== id)
        : [...wishlist, id];
      if (user) {
        void api("/account/wishlist", "PUT", { ids: next })
          .then(() => setWishlist(next))
          .catch((e) => setNotice(e.message));
      } else setWishlist(next);
    },
    toggleCompare: (id) =>
      setCompared((v) =>
        v.includes(id)
          ? v.filter((x) => x !== id)
          : v.length >= 4
            ? v
            : [...v, id],
      ),
    addToCart: (product, qty = 1) => {
      const current = cartIds.find((i) => i.id === product.id)?.qty || 0;
      if (
        !Number.isInteger(qty) ||
        qty < 1 ||
        current + qty > Math.min(product.stock, 100)
      ) {
        setNotice(
          "Số lượng vượt quá tồn kho hoặc giới hạn 100 sản phẩm mỗi loại.",
        );
        return false;
      }
      const next = cartIds.some((i) => i.id === product.id)
        ? cartIds.map((i) =>
            i.id === product.id ? { ...i, qty: i.qty + qty } : i,
          )
        : [...cartIds, { id: product.id, qty }];
      saveStored("shop-cart", next);
      setCartIds(next);
      setNotice("Đã thêm sản phẩm vào giỏ hàng.");
      return true;
    },
    updateQty: (id, qty) => {
      const product = catalog.find((p) => p.id === id);
      if (
        !product ||
        !Number.isInteger(qty) ||
        qty > Math.min(product.stock, 100)
      ) {
        setNotice("Số lượng vượt quá tồn kho.");
        return;
      }
      setCartIds((items) =>
        qty < 1
          ? items.filter((i) => i.id !== id)
          : items.map((i) => (i.id === id ? { ...i, qty } : i)),
      );
    },
    removeCart: (id) => setCartIds((items) => items.filter((i) => i.id !== id)),
    openQuickView: setQuickView,
  };
  if (error)
    return (
      <main className="container-store py-12">
        <h1 className="text-2xl font-bold">Không thể kết nối cửa hàng</h1>
        <p className="my-4">{error}</p>
        <button onClick={() => window.location.reload()} className="border p-3">
          Thử lại
        </button>
      </main>
    );
  if (!ready)
    return (
      <main className="container-store py-12" role="status">
        Đang tải cửa hàng...
      </main>
    );
  return (
    <div className="texture min-h-[100dvh] pb-32 md:pb-0">
      <Header ctx={ctx} />
      {notice && (
        <div
          role="status"
          className="container-store flex items-center justify-between gap-3 border bg-amber-50 p-3"
        >
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      )}
      <Switch>
        <Route path="/">
          <HomePage ctx={ctx} />
        </Route>
        <Route path="/products">
          <ProductsPage ctx={ctx} />
        </Route>
        <Route path="/products/:id">
          <ProductDetail ctx={ctx} />
        </Route>
        <Route path="/compare">
          <CompareExperience ctx={ctx} />
        </Route>
        <Route path="/cart">
          <CartPage ctx={ctx} />
        </Route>
        <Route path="/checkout">
          <CheckoutPage ctx={ctx} />
        </Route>
        <Route path="/orders/:id">
          <OrderPage ctx={ctx} />
        </Route>
        <Route path="/order-success">
          <OrderPage ctx={ctx} />
        </Route>
        <Route path="/account">
          <AccountPage ctx={ctx} />
        </Route>
        <Route path="/news">
          <NewsPage />
        </Route>
        <Route path="/news/:id">
          <ArticlePage ctx={ctx} />
        </Route>
        <Route path="/admin">
          <AdminPage ctx={ctx} />
        </Route>
        <Route path="/pages/:id">
          <ContentPage />
        </Route>
        <Route path="/stores">
          <StoresPage />
        </Route>
        <Route path="/support">
          <SupportPage ctx={ctx} />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
      <Footer />
      <BottomNav ctx={ctx} />
      <FloatingContacts />
      {quickView && (
        <QuickViewModal
          product={quickView}
          ctx={ctx}
          close={() => setQuickView(null)}
        />
      )}
    </div>
  );
}
export default AppShell;
