import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import type { StoreContext } from "../App";
import type { Product } from "../data/mock-data";
import { api, type ShopOrder, type User } from "../lib/shop-api";

import {
  SocialButtons,
  PaymentActions,
  RecentlyViewed,
  useShopConfig,
} from "./store-extras";
import { AdminExtras } from "./admin-extras";
const money = (value: number) => value.toLocaleString("vi-VN") + "₫";
const field = "mt-1 block w-full border border-slate-300 bg-white p-3";
const button =
  "bg-[#0b4fa4] px-5 py-3 font-semibold text-white disabled:opacity-50";
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Có lỗi xảy ra";
function Message({ text }: { text: string }) {
  return text ? (
    <p
      role="status"
      className="my-4 border border-amber-300 bg-amber-50 p-3 text-sm"
    >
      {text}
    </p>
  ) : null;
}

export function AccountPage({ ctx }: { ctx: StoreContext }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [ordersError, setOrdersError] = useState("");
  useEffect(() => {
    let active = true;
    setOrders([]);
    setOrdersError("");
    if (ctx.user)
      api<ShopOrder[]>("/orders")
        .then((value) => {
          if (active) setOrders(value);
        })
        .catch((e) => {
          if (active) setOrdersError(errorText(e));
        });
    return () => {
      active = false;
    };
  }, [ctx.user?.id]);
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const user = await api<User>(
        register ? "/auth/register" : "/auth/login",
        "POST",
        body,
      );
      ctx.setUser(user);
      setMessage("Đã đăng nhập. Bạn có thể tiếp tục đặt hàng.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      ctx.setUser(
        await api<User>(
          "/account",
          "PATCH",
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      );
      setMessage("Đã lưu thông tin tài khoản.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container-store py-10">
      <h1 className="mb-6 text-3xl font-bold">
        {ctx.user
          ? `Xin chào, ${ctx.user.name}`
          : register
            ? "Tạo tài khoản"
            : "Đăng nhập"}
      </h1>
      <Message text={message} />
      <SocialButtons user={Boolean(ctx.user)} />
      {!ctx.user ? (
        <form
          onSubmit={authenticate}
          className="max-w-lg space-y-4 border bg-white p-6"
        >
          {register && (
            <label className="block">
              Họ tên
              <input
                name="name"
                required
                minLength={2}
                maxLength={200}
                autoComplete="name"
                className={field}
              />
            </label>
          )}
          <label className="block">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={200}
              className={field}
            />
          </label>
          <label className="block">
            Mật khẩu
            <input
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              className={field}
            />
          </label>
          <p className="text-sm text-slate-500">
            Mật khẩu từ 10 đến 128 ký tự.
          </p>
          <button disabled={busy} className={button}>
            {busy ? "Đang xử lý..." : register ? "Đăng ký" : "Đăng nhập"}
          </button>
          <button
            type="button"
            className="ml-4 underline"
            onClick={() => {
              setRegister(!register);
              setMessage("");
            }}
          >
            {register ? "Đã có tài khoản" : "Tạo tài khoản mới"}
          </button>
        </form>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/checkout" className={button}>
              Tiếp tục đặt hàng
            </Link>
            {ctx.user.role === "admin" && (
              <Link href="/admin" className={button}>
                Quản trị
              </Link>
            )}
            <button
              disabled={busy}
              className="border px-5 py-3"
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/auth/logout", "POST");
                  ctx.setUser(null);
                  setOrders([]);
                  setMessage("Đã đăng xuất.");
                } catch (e) {
                  setMessage(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Đăng xuất
            </button>
          </div>
          <form
            key={ctx.user.id}
            onSubmit={saveProfile}
            className="max-w-2xl space-y-4 border bg-white p-6"
          >
            <h2 className="text-xl font-bold">Thông tin tài khoản</h2>
            <p>{ctx.user.email}</p>
            <label className="block">
              Họ tên
              <input
                name="name"
                defaultValue={ctx.user.name}
                required
                minLength={2}
                maxLength={200}
                className={field}
              />
            </label>
            <label className="block">
              Điện thoại
              <input
                name="phone"
                defaultValue={ctx.user.phone}
                pattern="(0[0-9]{9}|\+84[0-9]{9})"
                className={field}
              />
            </label>
            <label className="block">
              Địa chỉ
              <input
                name="address"
                defaultValue={ctx.user.address}
                maxLength={500}
                className={field}
              />
            </label>
            <button disabled={busy} className={button}>
              Lưu thay đổi
            </button>
          </form>
          <section>
            <h2 className="mb-4 text-xl font-bold">Đơn hàng của tôi</h2>
            <Message text={ordersError} />
            {!orders.length && !ordersError && <p>Chưa có đơn hàng.</p>}
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block border bg-white p-4"
                >
                  <b className="break-all">{order.id}</b>
                  <p>
                    {new Date(order.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {money(order.total)} · {order.status}
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-xl font-bold">Sản phẩm yêu thích</h2>
            {ctx.wishlist.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {ctx.catalog
                  .filter((p) => ctx.wishlist.includes(p.id))
                  .map((p) => (
                    <div key={p.id} className="border bg-white p-4">
                      <Link href={`/products/${p.id}`} className="font-bold">
                        {p.name}
                      </Link>
                      <p>{money(p.price)}</p>
                      <button
                        onClick={() => ctx.toggleWishlist(p.id)}
                        className="mt-2 underline"
                      >
                        Bỏ yêu thích
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p>Chưa có sản phẩm yêu thích.</p>
            )}
          </section>
        </div>
      )}
      {ctx.user && (
        <>
          <RecentlyViewed ctx={ctx} />
          <button
            className="mt-5 underline"
            onClick={async () => {
              try {
                await api("/newsletter", "DELETE");
                setMessage("Đã hủy đăng ký nhận tin của tài khoản.");
              } catch (e) {
                setMessage(errorText(e));
              }
            }}
          >
            Hủy nhận tin qua email
          </button>
        </>
      )}
    </main>
  );
}

export function CheckoutPage({ ctx }: { ctx: StoreContext }) {
  const [install, setInstall] = useState(false);
  const [method, setMethod] = useState("cod");
  const config = useShopConfig();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [, navigate] = useLocation();
  const request = useRef<{ body: string; key: string } | null>(null);
  const sending = useRef(false);
  const subtotal = ctx.cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = subtotal >= 10000000 ? 0 : 35000;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    const recipient = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      recipient,
      items: ctx.cart.map((i) => ({ id: i.product.id, qty: i.qty })),
      method,
      install,
      expectedSubtotal: subtotal,
    };
    const serialized = JSON.stringify(body);
    if (!request.current) {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(`shop-checkout-${ctx.user!.id}`) || "null",
        );
        if (saved?.body === serialized && typeof saved.key === "string")
          request.current = saved;
      } catch {
        /* Storage is optional. */
      }
    }
    if (request.current?.body !== serialized)
      request.current = { body: serialized, key: crypto.randomUUID() };
    try {
      sessionStorage.setItem(
        `shop-checkout-${ctx.user!.id}`,
        JSON.stringify(request.current),
      );
    } catch {
      /* Storage is optional. */
    }
    try {
      const order = await api<ShopOrder>(
        "/orders",
        "POST",
        body,
        request.current!.key,
      );
      try {
        sessionStorage.removeItem(`shop-checkout-${ctx.user!.id}`);
      } catch {
        /* Storage is optional. */
      }
      ctx.clearCart();
      navigate(`/orders/${order.id}?placed=1`);
      void ctx.refreshCatalog();
    } catch (error) {
      setMessage(errorText(error));
      void ctx.refreshCatalog();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (!ctx.user)
    return (
      <main className="container-store py-12">
        <h1 className="text-2xl font-bold">Đăng nhập để đặt hàng</h1>
        <p className="my-4">
          Giỏ hàng của bạn được giữ lại để tiếp tục sau khi đăng nhập.
        </p>
        <Link href="/account" className={button}>
          Đăng nhập / Đăng ký
        </Link>
      </main>
    );
  if (!ctx.cart.length)
    return (
      <main className="container-store py-12">
        <h1 className="text-2xl font-bold">Giỏ hàng đang trống</h1>
        <Link href="/products" className="mt-5 inline-block underline">
          Chọn sản phẩm
        </Link>
      </main>
    );
  return (
    <main className="container-store py-10">
      <h1 className="mb-6 text-3xl font-bold">Đặt hàng</h1>
      <Message text={message} />
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <fieldset disabled={busy} className="space-y-4 border bg-white p-6">
          <legend className="font-bold">Thông tin người nhận</legend>
          <label className="block">
            Họ tên
            <input
              name="name"
              required
              minLength={2}
              maxLength={200}
              defaultValue={ctx.user.name}
              autoComplete="name"
              className={field}
              data-testid="input-checkout-name"
            />
          </label>
          <label className="block">
            Số điện thoại
            <input
              name="phone"
              type="tel"
              required
              pattern="(0[0-9]{9}|\+84[0-9]{9})"
              defaultValue={ctx.user.phone}
              autoComplete="tel"
              placeholder="0901234567"
              className={field}
              data-testid="input-checkout-phone"
            />
          </label>
          <label className="block">
            Địa chỉ
            <input
              name="address"
              required
              minLength={8}
              maxLength={500}
              defaultValue={ctx.user.address}
              autoComplete="street-address"
              className={field}
              data-testid="input-checkout-address"
            />
          </label>
          <label className="block">
            Tỉnh / thành phố
            <input
              name="city"
              required
              minLength={2}
              maxLength={200}
              autoComplete="address-level1"
              className={field}
              data-testid="input-checkout-city"
            />
          </label>
          <label className="block">
            Ghi chú
            <textarea name="note" maxLength={1000} className={field} />
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={install}
              onChange={(e) => setInstall(e.target.checked)}
              className="mr-2"
            />
            Lắp đặt tận nơi (+250.000₫)
          </label>
          <h2 className="pt-4 text-xl font-bold">Thanh toán</h2>
          <select
            aria-label="Phương thức thanh toán"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={field}
          >
            <option value="cod">Tiền mặt khi nhận hàng (COD)</option>
            {config?.payments.vnpay && (
              <option value="vnpay">VNPAY — ATM / thẻ / QR</option>
            )}
            {config?.payments.momo && <option value="momo">Ví MoMo</option>}
          </select>
          {method !== "cod" && config?.payments.environment === "sandbox" && (
            <p className="text-amber-700">
              Thanh toán đang ở môi trường thử nghiệm sandbox.
            </p>
          )}
        </fieldset>
        <div className="h-fit space-y-4 border bg-white p-6">
          <h2 className="text-xl font-bold">Đơn hàng của bạn</h2>
          {ctx.cart.map((i) => (
            <div key={i.product.id} className="border-b pb-3">
              <p>
                {i.product.name} × {i.qty}
              </p>
              <b>{money(i.product.price * i.qty)}</b>
            </div>
          ))}
          <p>Tạm tính: {money(subtotal)}</p>
          <p>Giao hàng: {shipping ? money(shipping) : "Miễn phí"}</p>
          <p>Lắp đặt: {money(install ? 250000 : 0)}</p>
          <p className="text-xl font-bold">
            Tổng: {money(subtotal + shipping + (install ? 250000 : 0))}
          </p>
          <button
            className={`${button} w-full`}
            disabled={busy}
            data-testid="button-place-order"
          >
            {busy ? "Đang tạo đơn..." : "Xác nhận đặt hàng"}
          </button>
        </div>
      </form>
    </main>
  );
}

export function OrderPage({ ctx }: { ctx: StoreContext }) {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setMessage("");
    try {
      setOrder(await api<ShopOrder>(`/orders/${encodeURIComponent(id || "")}`));
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setOrder(null);
    if (ctx.user && id) void load();
  }, [id, ctx.user?.id]);
  if (!ctx.user)
    return (
      <main className="container-store py-10">
        <Link href="/account" className={button}>
          Đăng nhập để xem đơn hàng
        </Link>
      </main>
    );
  if (!id)
    return (
      <main className="container-store py-10">
        <Link href="/account" className={button}>
          Xem đơn hàng của tôi
        </Link>
      </main>
    );
  return (
    <main className="container-store py-10">
      <h1 className="text-3xl font-bold">Chi tiết đơn hàng</h1>
      <Message text={message} />
      {busy && <p>Đang tải...</p>}
      {order && (
        <div className="mt-6 max-w-3xl space-y-4 border bg-white p-6">
          <h2 className="break-all font-bold">{order.id}</h2>
          <p>Đặt lúc: {new Date(order.createdAt).toLocaleString("vi-VN")}</p>
          <p>
            Trạng thái: <b>{order.status}</b>
          </p>
          <p>
            {order.method === "cod"
              ? "Tiền mặt khi nhận hàng"
              : order.method.toUpperCase()}{" "}
            · {order.paymentStatus}
          </p>
          <PaymentActions order={order} onChange={load} />
          <p>
            {order.recipient.name} · {order.recipient.phone}
          </p>
          <p>
            {order.recipient.address}, {order.recipient.city}
          </p>
          {order.recipient.note && <p>Ghi chú: {order.recipient.note}</p>}
          {order.items.map((i) => (
            <p key={i.id}>
              {i.name} × {i.qty}: {money(i.price * i.qty)}
            </p>
          ))}
          <p>
            Giao hàng: {money(order.shipping)} · Lắp đặt:{" "}
            {money(order.installation)}
          </p>
          <p className="text-xl font-bold">
            Tổng thanh toán: {money(order.total)}
          </p>
        </div>
      )}
      <div className="mt-6 flex gap-4">
        <button className={button} disabled={busy} onClick={load}>
          Cập nhật trạng thái
        </button>
        <Link href="/account" className="p-3 underline">
          Đơn hàng của tôi
        </Link>
      </div>
    </main>
  );
}

export function AdminPage({ ctx }: { ctx: StoreContext }) {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setOrders(await api<ShopOrder[]>("/admin/orders"));
      await ctx.refreshCatalog();
      setMessage("");
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (ctx.user?.role === "admin") void load();
  }, [ctx.user?.id]);
  if (!ctx.user)
    return (
      <main className="container-store py-10">
        <Link href="/account" className={button}>
          Đăng nhập quản trị
        </Link>
      </main>
    );
  if (ctx.user.role !== "admin")
    return (
      <main className="container-store py-10">
        <h1 className="text-2xl font-bold">
          Bạn không có quyền truy cập khu vực này.
        </h1>
      </main>
    );
  const next: Record<string, string[]> = {
    "Chờ thanh toán": ["Đã hủy"],
    "Chờ xác nhận": ["Đã xác nhận", "Đã hủy"],
    "Đã xác nhận": ["Đang giao", "Đã hủy"],
    "Đang giao": ["Đã giao"],
  };
  return (
    <main className="container-store space-y-8 py-10">
      <h1 className="text-3xl font-bold">Quản trị cửa hàng</h1>
      <Message text={message} />
      <button onClick={load} disabled={busy} className={button}>
        Làm mới dữ liệu
      </button>
      <div className="grid gap-4 sm:grid-cols-3">
        <p className="border p-5">
          Tổng đơn: <b>{orders.length}</b>
        </p>
        <p className="border p-5">
          Chờ xác nhận:{" "}
          <b>{orders.filter((o) => o.status === "Chờ xác nhận").length}</b>
        </p>
        <p className="border p-5">
          Giá trị đơn đã giao:{" "}
          <b>
            {money(
              orders
                .filter((o) => o.status === "Đã giao")
                .reduce((s, o) => s + o.total, 0),
            )}
          </b>
        </p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Đơn hàng</h2>
        {!orders.length && <p>Chưa có đơn hàng.</p>}
        {orders.map((o) => (
          <article key={o.id} className="space-y-2 border bg-white p-4">
            <h3 className="break-all font-bold">{o.id}</h3>
            <p>
              {o.recipient.name} · {o.recipient.phone} · {o.recipient.address},{" "}
              {o.recipient.city}
            </p>
            {o.items.map((i) => (
              <p key={i.id}>
                {i.name} × {i.qty}
              </p>
            ))}
            <p>
              {money(o.total)} · {o.status} · {o.paymentStatus}
            </p>
            <div className="flex gap-3">
              {o.method === "cod" &&
                o.status === "Đã giao" &&
                o.paymentStatus !== "Đã thanh toán" && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm("Xác nhận đã thực nhận tiền COD?"))
                        return;
                      setBusy(true);
                      try {
                        await api(
                          "/admin/orders/" + o.id + "/collect-cod",
                          "POST",
                        );
                        await load();
                      } catch (e) {
                        setMessage(errorText(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Ghi nhận đã thu COD
                  </button>
                )}
              {(next[o.status] || []).map((status) => (
                <button
                  key={status}
                  disabled={busy}
                  className="border px-3 py-2"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api(`/admin/orders/${o.id}`, "PATCH", { status });
                      await load();
                    } catch (e) {
                      setMessage(errorText(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Giá và tồn kho</h2>
        {ctx.catalog.map((p) => (
          <InventoryRow
            key={`${p.id}-${p.price}-${p.stock}`}
            product={p}
            onSaved={load}
            onError={setMessage}
          />
        ))}
      </section>
      <AdminExtras ctx={ctx} />
    </main>
  );
}
function InventoryRow({
  product,
  onSaved,
  onError,
}: {
  product: Product;
  onSaved: () => Promise<void>;
  onError: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-3 border bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await api(`/admin/products/${product.id}`, "PATCH", {
            price: Number(data.get("price")),
            stock: Number(data.get("stock")),
          });
          await onSaved();
        } catch (error) {
          onError(errorText(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="min-w-48 flex-1">{product.name}</p>
      <label>
        Giá
        <input
          name="price"
          type="number"
          min="1"
          max="1000000000"
          required
          defaultValue={product.price}
          className={field}
        />
      </label>
      <label>
        Tồn kho
        <input
          name="stock"
          type="number"
          min="0"
          max="1000000"
          required
          defaultValue={product.stock}
          className={`${field} max-w-32`}
        />
      </label>
      <button disabled={busy} className={button}>
        Lưu
      </button>
    </form>
  );
}
