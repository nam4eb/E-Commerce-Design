import { useEffect, useState } from "react";
import { Link, useParams, useSearch, useLocation } from "wouter";
import type { StoreContext } from "../App";
import { api, readStored } from "../lib/shop-api";
const input = "block w-full border border-slate-300 bg-white p-2 mt-1";
const button =
  "border border-blue-700 bg-blue-700 text-white px-4 py-2 disabled:opacity-50";
export type ShopConfig = {
  social: { google: boolean; facebook: boolean };
  payments: {
    cod: boolean;
    vnpay: boolean;
    momo: boolean;
    environment: string;
  };
  contact: { phone: string; zalo: string; facebook: string };
  ai: { enabled: boolean; model: string };
};
export function useShopConfig() {
  const [config, set] = useState<ShopConfig | null>(null);
  useEffect(() => {
    api<ShopConfig>("/config")
      .then(set)
      .catch(() => {});
  }, []);
  return config;
}
export function SocialButtons({ user }: { user: boolean }) {
  const config = useShopConfig();
  const search = useSearch();
  const [message, setMessage] = useState(
    new URLSearchParams(search).get("authError") || "",
  );
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);
  useEffect(() => {
    if (user)
      api<string[]>("/account/identities")
        .then(setLinked)
        .catch((e) => setMessage(e.message));
    else setLinked([]);
  }, [user]);
  return (
    <section className="my-5 space-y-3">
      {message && (
        <p role="alert" className="text-red-700">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {(["google", "facebook"] as const)
          .filter((p) => config?.social[p])
          .map((provider) => (
            <button
              type="button"
              key={provider}
              disabled={busy || linked.includes(provider)}
              className="border bg-white px-4 py-3"
              onClick={async () => {
                setBusy(true);
                try {
                  const { url } = await api<{ url: string }>(
                    `/auth/${provider}/start`,
                    "POST",
                    { link: user },
                  );
                  window.location.assign(url);
                } catch (e) {
                  setMessage((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              {linked.includes(provider)
                ? "Đã liên kết"
                : user
                  ? "Liên kết"
                  : "Đăng nhập bằng"}{" "}
              {provider === "google" ? "Google" : "Facebook"}
            </button>
          ))}
      </div>
    </section>
  );
}
export function PaymentActions({
  order,
  onChange,
}: {
  order: any;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="my-4 space-y-3">
      {message && <p role="alert">{message}</p>}
      {order.status === "Chờ thanh toán" && (
        <>
          <p>
            Chỉ chuyển sang đã thanh toán sau khi nhận xác nhận từ cổng thanh
            toán. Không thanh toán lại khi chưa rõ kết quả.
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{ url: string }>(
                  `/orders/${order.id}/payment`,
                  "POST",
                );
                window.location.assign(result.url);
              } catch (e) {
                setMessage((e as Error).message);
                setBusy(false);
              }
            }}
          >
            Thanh toán qua {order.method.toUpperCase()}
          </button>
          <button
            className="ml-3 border px-4 py-2"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ message: string }>(
                  `/orders/${order.id}/payment/check`,
                  "POST",
                );
                setMessage(r.message);
                onChange();
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Kiểm tra tại cổng thanh toán
          </button>
        </>
      )}
      {["Chờ xác nhận", "Chờ thanh toán"].includes(order.status) && (
        <button
          className="ml-3 border px-4 py-2"
          disabled={busy}
          onClick={async () => {
            if (
              !window.confirm(
                "Hủy đơn này? Nếu đã thanh toán, cửa hàng cần xử lý hoàn tiền riêng.",
              )
            )
              return;
            setBusy(true);
            try {
              await api(`/orders/${order.id}/cancel`, "POST");
              onChange();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Hủy đơn hàng
        </button>
      )}
      <Link className="ml-3 underline" href="/support">
        Yêu cầu hỗ trợ
      </Link>
    </section>
  );
}
export function Newsletter() {
  const [message, set] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const form = e.currentTarget;
        const data = new FormData(form);
        try {
          await api("/newsletter", "POST", {
            email: data.get("email"),
            consent: data.get("consent") === "on",
          });
          set("Đã lưu đăng ký nhận tin.");
          form.reset();
        } catch (err) {
          set((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Email nhận tin
        <input
          className={`${input} text-slate-900`}
          type="email"
          name="email"
          required
          placeholder="Email của bạn"
        />
      </label>
      <label className="my-2 block text-xs">
        <input type="checkbox" name="consent" required /> Tôi đồng ý nhận thông
        tin ưu đãi.
      </label>
      <button className={button} disabled={busy}>
        Đăng ký
      </button>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </form>
  );
}
export function ContentPage() {
  const { id } = useParams<{ id: string }>();
  const [page, set] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    set(null);
    setError("");
    api<any[]>("/content/page")
      .then((rows) => {
        const p = rows.find((r) => r.id === id);
        if (p) set(p);
        else setError("Không tìm thấy trang.");
      })
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <main className="container-store py-10">
      <h1 className="text-3xl font-bold">
        {page?.title || error || "Đang tải..."}
      </h1>
      <div className="mt-6 max-w-3xl whitespace-pre-line leading-8">
        {page?.body}
      </div>
      <Link href="/support" className="mt-6 inline-block underline">
        Liên hệ hỗ trợ
      </Link>
    </main>
  );
}
export function StoresPage() {
  const [rows, set] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<any[]>("/content/store")
      .then(set)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="container-store py-10">
      <h1 className="text-3xl font-bold">Hệ thống cửa hàng</h1>
      <p role="status">{error}</p>
      {!rows.length && !error && (
        <p className="mt-5">
          Chưa có địa chỉ cửa hàng được công bố. Vui lòng liên hệ hỗ trợ để được
          hướng dẫn.
        </p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <article className="border bg-white p-5" key={r.id}>
            <h2 className="font-bold">{r.title}</h2>
            <p className="whitespace-pre-line">{r.body}</p>
            <a
              className="mt-3 inline-block underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.body)}`}
            >
              Mở bản đồ
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
export function SupportPage({ ctx }: { ctx: StoreContext }) {
  const [rows, set] = useState<any[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    api<any[]>("/support")
      .then(set)
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    if (ctx.user) void load();
  }, [ctx.user?.id]);
  if (!ctx.user)
    return (
      <main className="container-store py-10">
        <Link href="/account">Đăng nhập để gửi yêu cầu hỗ trợ</Link>
      </main>
    );
  return (
    <main className="container-store py-10">
      <h1 className="text-3xl font-bold">Hỗ trợ khách hàng</h1>
      <p role="status" className="my-4">
        {message}
      </p>
      <form
        className="max-w-xl space-y-4 border bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          try {
            await api(
              "/support",
              "POST",
              Object.fromEntries(new FormData(form)),
            );
            form.reset();
            setMessage("Đã gửi yêu cầu. Bạn có thể xem phản hồi bên dưới.");
            await load();
          } catch (err) {
            setMessage((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Chủ đề
          <input
            className={input}
            name="subject"
            required
            minLength={3}
            maxLength={200}
          />
        </label>
        <label className="block">
          Nội dung và mã đơn nếu có
          <textarea
            className={input}
            name="body"
            required
            minLength={10}
            maxLength={5000}
          />
        </label>
        <button className={button} disabled={busy}>
          Gửi yêu cầu
        </button>
      </form>
      <button onClick={load} className="my-5 underline">
        Cập nhật phản hồi
      </button>
      {rows.map((r) => (
        <article key={r.id} className="mb-4 border bg-white p-5">
          <b>
            {r.subject} · {r.status}
          </b>
          <p className="whitespace-pre-line">{r.body}</p>
          {r.reply && (
            <p className="mt-4 whitespace-pre-line bg-blue-50 p-3">
              Phản hồi: {r.reply}
            </p>
          )}
        </article>
      ))}
    </main>
  );
}
export function Reviews({ id, ctx }: { id: string; ctx: StoreContext }) {
  const [rows, set] = useState<any[]>([]),
    [message, setMessage] = useState("");
  const load = () =>
    api<any[]>(`/products/${id}/reviews`)
      .then(set)
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    void load();
  }, [id]);
  return (
    <section className="mt-10 border p-5">
      <h2 className="text-xl font-bold">Đánh giá từ khách đã mua</h2>
      <p role="status">{message}</p>
      {rows.length ? (
        rows.map((r, i) => (
          <article className="border-b py-3" key={i}>
            <b>
              {r.name} · {r.rating}/5
            </b>
            <p>{r.body}</p>
          </article>
        ))
      ) : (
        <p className="my-4">Chưa có đánh giá.</p>
      )}
      {ctx.user ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            try {
              await api(`/products/${id}/reviews`, "POST", {
                rating: Number(data.get("rating")),
                body: data.get("body"),
              });
              setMessage("Đã lưu đánh giá.");
              await load();
              await ctx.refreshCatalog();
            } catch (err) {
              setMessage((err as Error).message);
            }
          }}
        >
          <label>
            Điểm đánh giá
            <select className={input} name="rating">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} sao
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Nhận xét
            <textarea
              className={input}
              name="body"
              required
              minLength={10}
              maxLength={3000}
            />
          </label>
          <button className={button}>Gửi / cập nhật đánh giá</button>
          <p className="text-sm text-slate-500">
            Áp dụng cho sản phẩm trong đơn đã giao của bạn.
          </p>
        </form>
      ) : (
        <Link href="/account" className="underline">
          Đăng nhập để đánh giá
        </Link>
      )}
    </section>
  );
}
export function RecentlyViewed({ ctx }: { ctx: StoreContext }) {
  const ids = readStored<string[]>("shop-viewed", []);
  const selected = Array.isArray(ids)
    ? ids.map((id) => ctx.catalog.find((p) => p.id === id)).filter(Boolean)
    : [];
  return (
    <section>
      <h2 className="my-4 text-xl font-bold">Đã xem gần đây</h2>
      {selected.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {selected.map((p) => (
            <Link
              className="border p-4"
              key={p!.id}
              href={`/products/${p!.id}`}
            >
              {p!.name}
            </Link>
          ))}
        </div>
      ) : (
        <p>Chưa có sản phẩm đã xem.</p>
      )}
    </section>
  );
}
export function ContactLinks() {
  const config = useShopConfig();
  const c = config?.contact;
  return (
    <div
      className={`fixed bottom-16 z-40 flex gap-2 md:bottom-5 ${config?.ai.enabled ? "right-20" : "right-3"}`}
    >
      {c?.phone && (
        <a className={button} href={`tel:${c.phone}`}>
          Gọi hỗ trợ
        </a>
      )}
      {c?.zalo && (
        <a className={button} href={c.zalo} target="_blank" rel="noreferrer">
          Zalo
        </a>
      )}
      {c?.facebook && (
        <a
          className={button}
          href={c.facebook}
          target="_blank"
          rel="noreferrer"
        >
          Facebook
        </a>
      )}
      <Link className={button} href="/support">
        Hỗ trợ
      </Link>
    </div>
  );
}
export function NewsArticle({ ctx }: { ctx: StoreContext }) {
  const { id } = useParams<{ id: string }>();
  const [article, set] = useState<any>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    set(null);
    api<any[]>("/content/article")
      .then((rows) => {
        const found = rows.find((a) => a.id === id);
        if (found) set(found);
        else setMessage("Không tìm thấy bài viết.");
      })
      .catch((e) => setMessage(e.message));
  }, [id]);
  return (
    <main className="container-store py-10">
      <Link className="underline" href="/news">
        ← Tin tức
      </Link>
      <p role="status">{message}</p>
      {article && (
        <article className="mx-auto mt-6 max-w-3xl">
          <h1 className="text-3xl font-bold">{article.title}</h1>
          {article.image && (
            <img
              className="mt-6 aspect-video w-full object-cover"
              alt={article.title}
              src={article.image}
            />
          )}
          <div className="my-6 whitespace-pre-line leading-8">
            {article.body}
          </div>
          <h2 className="text-xl font-bold">Sản phẩm liên quan</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ctx.catalog
              .filter(
                (p) =>
                  article.categoryId === "all" ||
                  p.categoryId === article.categoryId,
              )
              .slice(0, 4)
              .map((p) => (
                <div key={p.id} className="border p-4">
                  <Link href={`/products/${p.id}`}>{p.name}</Link>
                  <button
                    className={`${button} mt-3 block`}
                    onClick={() => ctx.addToCart(p)}
                  >
                    Thêm vào giỏ
                  </button>
                </div>
              ))}
          </div>
        </article>
      )}
    </main>
  );
}
export function PromoSection({
  ctx,
  renderProduct,
}: {
  ctx: StoreContext;
  renderProduct: (p: any) => React.ReactNode;
}) {
  const [promos, set] = useState<any[]>([]),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    api<any[]>("/content/promotion")
      .then(set)
      .catch(() => {});
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      {promos
        .filter((p) => Date.parse(p.endsAt) > now)
        .map((p) => {
          const left = Math.max(
            0,
            Math.floor((Date.parse(p.endsAt) - now) / 1000),
          );
          return (
            <section key={p.id} className="bg-blue-800 py-10 text-white">
              <div className="container-store">
                <h2 className="text-3xl font-bold">{p.title}</h2>
                <p>{p.body}</p>
                <p className="my-3 font-mono">
                  Còn {Math.floor(left / 3600)} giờ{" "}
                  {Math.floor((left % 3600) / 60)} phút {left % 60} giây
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {ctx.catalog
                    .filter((item) => p.productIds?.includes(item.id))
                    .map(renderProduct)}
                </div>
              </div>
            </section>
          );
        })}
    </>
  );
}

export function CatalogPage({
  ctx,
  renderProduct,
}: {
  ctx: StoreContext;
  renderProduct: (p: any) => React.ReactNode;
}) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [, navigate] = useLocation();
  const [category, setCategory] = useState(params.get("category") || "all"),
    [brand, setBrand] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [sort, setSort] = useState(params.get("sort") || "popular"),
    [btu, setBtu] = useState(""),
    [inverter, setInverter] = useState(false),
    [limit, setLimit] = useState(12);
  useEffect(() => {
    setCategory(params.get("category") || "all");
    setSort(params.get("sort") || "popular");
    setLimit(12);
  }, [search]);
  const query = (params.get("q") || "").trim().toLowerCase();
  const invalid = Boolean(min && max && Number(min) > Number(max));
  const rows = ctx.catalog
    .filter(
      (p) =>
        (!query ||
          `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(query)) &&
        (category === "all" || p.categoryId === category) &&
        (!brand || p.brand === brand) &&
        (!min || p.price >= Number(min)) &&
        (!max || p.price <= Number(max)) &&
        (!btu || p.tags.includes(btu)) &&
        (!inverter || p.tags.includes("Inverter")),
    )
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : sort === "sale"
            ? 1 - b.price / b.oldPrice - (1 - a.price / a.oldPrice)
            : b.sold - a.sold,
    );
  const clear = () => {
    setCategory("all");
    setBrand("");
    setMin("");
    setMax("");
    setBtu("");
    setInverter(false);
    setLimit(12);
    navigate("/products");
  };
  return (
    <main className="container-store py-8">
      <h1 className="text-3xl font-bold">
        {query ? `Kết quả cho “${query}”` : "Sản phẩm"}
      </h1>
      <div className="my-6 grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4 border bg-white p-4">
          <label className="block">
            Danh mục
            <select
              className={input}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setBtu("");
                setInverter(false);
                setLimit(12);
              }}
            >
              <option value="all">Tất cả</option>
              {[
                ...new Map(
                  ctx.catalog.map((p) => [p.categoryId, p.category]),
                ).entries(),
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label} (
                  {ctx.catalog.filter((p) => p.categoryId === id).length})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Thương hiệu
            <select
              className={input}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="">Tất cả</option>
              {[...new Set(ctx.catalog.map((p) => p.brand))].sort().map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="block">
            Giá từ
            <input
              aria-label="Giá từ"
              data-testid="input-price-min"
              type="number"
              min="0"
              className={input}
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>
          <label className="block">
            Giá đến
            <input
              aria-label="Giá đến"
              data-testid="input-price-max"
              type="number"
              min="0"
              className={input}
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
          {category === "air-conditioner" && (
            <>
              <select
                aria-label="Công suất"
                className={input}
                value={btu}
                onChange={(e) => setBtu(e.target.value)}
              >
                <option value="">Tất cả công suất</option>
                {["9.000 BTU", "12.000 BTU", "18.000 BTU"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <label className="block">
                <input
                  type="checkbox"
                  checked={inverter}
                  onChange={(e) => setInverter(e.target.checked)}
                />{" "}
                Chỉ Inverter
              </label>
            </>
          )}
          <button onClick={clear} className="underline">
            Xóa bộ lọc
          </button>
        </aside>
        <div>
          <div className="mb-4 flex justify-between gap-3">
            <span>{invalid ? 0 : rows.length} sản phẩm</span>
            <select
              aria-label="Sắp xếp"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="popular">Phổ biến</option>
              <option value="sale">Ưu đãi tốt nhất</option>
              <option value="price-low">Giá thấp đến cao</option>
              <option value="price-high">Giá cao đến thấp</option>
            </select>
          </div>
          {invalid ? (
            <p role="alert">Giá từ phải nhỏ hơn hoặc bằng giá đến.</p>
          ) : rows.length ? (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {rows.slice(0, limit).map(renderProduct)}
              </div>
              {limit < rows.length && (
                <button
                  className={`${button} mt-5`}
                  onClick={() => setLimit(limit + 12)}
                >
                  Xem thêm
                </button>
              )}
            </>
          ) : (
            <p>
              Không có sản phẩm phù hợp.{" "}
              <button onClick={clear} className="underline">
                Xóa bộ lọc
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
