import { useEffect, useState } from "react";
import type { StoreContext } from "../App";
import { api } from "../lib/shop-api";
const input = "mt-1 block w-full border bg-white p-2";
const button = "border bg-blue-700 px-4 py-2 text-white disabled:opacity-50";
export function AdminExtras({ ctx }: { ctx: StoreContext }) {
  const [tab, setTab] = useState("support"),
    [rows, setRows] = useState<any[]>([]),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const content = ["page", "article", "store", "promotion"].includes(tab);
  const load = async () => {
    setBusy(true);
    setMessage("");
    try {
      setRows(await api<any[]>(content ? `/content/${tab}` : `/admin/${tab}`));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setSelected(null);
    setRows([]);
    if (tab !== "products") void load();
  }, [tab]);
  return (
    <section className="space-y-4 border-t pt-8">
      <h2 className="text-2xl font-bold">Quản lý cửa hàng</h2>
      <div className="flex flex-wrap gap-2">
        {Object.entries({
          support: "Hỗ trợ",
          customers: "Khách hàng",
          subscribers: "Đăng ký nhận tin",
          page: "Trang chính sách",
          article: "Tin tức",
          store: "Cửa hàng",
          promotion: "Chương trình ưu đãi",
          products: "Thêm sản phẩm",
        }).map(([id, label]) => (
          <button
            className={tab === id ? button : "border p-2"}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p role="status">{message}</p>
      {tab === "products" ? (
        <ProductForm ctx={ctx} report={setMessage} />
      ) : (
        <>
          <button disabled={busy} onClick={load} className="underline">
            Làm mới
          </button>
          {content && (
            <button onClick={() => setSelected({})} className="ml-4 underline">
              Tạo nội dung mới
            </button>
          )}
          {content && selected && (
            <form
              key={`${tab}-${selected.id || "new"}`}
              className="max-w-3xl space-y-3 border bg-white p-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const data = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await api(`/admin/content/${tab}/${data.id}`, "PUT", {
                    ...data,
                    productIds: String(data.productIds || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                  await load();
                  await ctx.refreshCatalog();
                  setSelected(null);
                } catch (err) {
                  setMessage((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="block">
                Mã nội dung
                <input
                  className={input}
                  name="id"
                  required
                  pattern="[a-z0-9-]+"
                  maxLength={80}
                  defaultValue={selected.id}
                  readOnly={Boolean(selected.id)}
                />
              </label>
              <label className="block">
                Tiêu đề
                <input
                  className={input}
                  name="title"
                  required
                  minLength={3}
                  defaultValue={selected.title}
                />
              </label>
              <label className="block">
                Nội dung / địa chỉ và giờ mở cửa
                <textarea
                  className={input}
                  rows={8}
                  name="body"
                  required
                  minLength={10}
                  defaultValue={selected.body}
                />
              </label>
              <label className="block">
                Ảnh (URL HTTPS, tùy chọn)
                <input
                  className={input}
                  name="image"
                  type="url"
                  defaultValue={selected.image}
                />
              </label>
              <label className="block">
                Danh mục liên quan
                <select
                  className={input}
                  name="categoryId"
                  defaultValue={selected.categoryId || "all"}
                >
                  <option value="all">Tất cả</option>
                  {[
                    ...new Map(
                      ctx.catalog.map((p) => [p.categoryId, p.category]),
                    ).entries(),
                  ].map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {tab === "promotion" && (
                <>
                  <label className="block">
                    Kết thúc lúc (kèm múi giờ, ví dụ 2026-12-31T23:59:00+07:00)
                    <input
                      className={input}
                      name="endsAt"
                      required
                      defaultValue={selected.endsAt}
                    />
                  </label>
                  <label className="block">
                    Mã sản phẩm, cách nhau bằng dấu phẩy
                    <input
                      className={input}
                      name="productIds"
                      defaultValue={selected.productIds?.join(", ")}
                    />
                  </label>
                  <p>
                    Giá bán được quản lý trong phần Giá và tồn kho; chương trình
                    này chọn sản phẩm để giới thiệu.
                  </p>
                </>
              )}
              <button disabled={busy} className={button}>
                Lưu nội dung
              </button>
            </form>
          )}
          <div className="space-y-3">
            {rows.length ? (
              rows.map((row, i) => (
                <article
                  key={row.id || row.email || i}
                  className="space-y-2 border bg-white p-4"
                >
                  {content ? (
                    <>
                      <b>{row.title}</b>
                      <p className="line-clamp-3 whitespace-pre-line">
                        {row.body}
                      </p>
                      <button
                        onClick={() => setSelected(row)}
                        className="underline"
                      >
                        Sửa
                      </button>
                      <button
                        className="ml-4 underline text-red-700"
                        disabled={busy}
                        onClick={async () => {
                          if (!window.confirm("Xóa nội dung này?")) return;
                          setBusy(true);
                          try {
                            await api(
                              `/admin/content/${tab}/${row.id}`,
                              "DELETE",
                            );
                            await load();
                            await ctx.refreshCatalog();
                          } catch (e) {
                            setMessage((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Xóa
                      </button>
                    </>
                  ) : tab === "support" ? (
                    <>
                      <b>
                        {row.subject} · {row.status}
                      </b>
                      <p className="whitespace-pre-line">{row.body}</p>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setBusy(true);
                          try {
                            await api(`/admin/support/${row.id}`, "PATCH", {
                              reply: new FormData(e.currentTarget).get("reply"),
                            });
                            await load();
                          } catch (err) {
                            setMessage((err as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <label>
                          Phản hồi
                          <textarea
                            className={input}
                            name="reply"
                            required
                            minLength={3}
                            defaultValue={row.reply}
                          />
                        </label>
                        <button className={`${button} mt-2`} disabled={busy}>
                          Gửi phản hồi trong tài khoản
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <b>{row.name || row.email}</b>
                      <p>
                        {row.email} {row.phone} {row.role}
                      </p>
                      <p>{row.address || row.created_at}</p>
                    </>
                  )}
                </article>
              ))
            ) : (
              <p>Chưa có dữ liệu.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function ProductForm({
  ctx,
  report,
}: {
  ctx: StoreContext;
  report: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="max-w-2xl space-y-3 border p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        setBusy(true);
        try {
          await api("/admin/products", "POST", {
            ...data,
            price: Number(data.price),
            stock: Number(data.stock),
          });
          form.reset();
          await ctx.refreshCatalog();
          report("Đã thêm sản phẩm.");
        } catch (err) {
          report((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {[
        ["id", "Mã sản phẩm"],
        ["name", "Tên sản phẩm"],
        ["brand", "Thương hiệu"],
        ["categoryId", "Mã danh mục"],
        ["category", "Tên danh mục"],
        ["image", "Ảnh (URL HTTPS)"],
      ].map(([id, label]) => (
        <label className="block" key={id}>
          {label}
          <input className={input} name={id} required />
        </label>
      ))}
      <label className="block">
        Giá bán
        <input
          className={input}
          name="price"
          type="number"
          min="1"
          max="1000000000"
          required
        />
      </label>
      <label className="block">
        Tồn kho
        <input
          className={input}
          name="stock"
          type="number"
          min="0"
          max="1000000"
          required
        />
      </label>
      <button className={button} disabled={busy}>
        Thêm sản phẩm
      </button>
    </form>
  );
}
