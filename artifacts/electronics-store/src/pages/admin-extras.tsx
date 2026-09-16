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
        <div className="space-y-6">
          <ProductImport ctx={ctx} report={setMessage} />
          <ProductForm ctx={ctx} report={setMessage} />
        </div>
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

type ImportPreview = {
  token: string;
  filename: string;
  sheets: number;
  total: number;
  updates: number;
  publishable: number;
  drafts: number;
  invalid: number;
  errors: { sheet: string; row: number; id: string; errors: string[] }[];
};

function ProductImport({
  ctx,
  report,
}: {
  ctx: StoreContext;
  report: (value: string) => void;
}) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const loadDrafts = () =>
    api<any[]>("/admin/product-drafts")
      .then(setDrafts)
      .catch((error) => report((error as Error).message));
  useEffect(() => {
    void loadDrafts();
  }, []);
  return (
    <section className="max-w-5xl space-y-4 rounded-lg border bg-white p-5">
      <div>
        <h3 className="text-lg font-bold">Cập nhật sản phẩm từ Excel</h3>
        <p className="text-sm text-slate-600">
          Header nằm ở dòng 4 theo file mẫu. Sản phẩm hiện có giữ nguyên giá và
          tồn kho nếu file không cung cấp. Sản phẩm mới thiếu giá/tồn kho sẽ vào
          bản nháp để duyệt trước khi bán.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const file = new FormData(event.currentTarget).get("file");
          if (!(file instanceof File) || !file.size) return;
          setBusy(true);
          report("");
          try {
            const body = new FormData();
            body.append("file", file);
            const response = await fetch("/api/admin/products/import/preview", {
              method: "POST",
              credentials: "same-origin",
              headers: { "X-Store-Request": "1" },
              body,
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(result.message || "Không đọc được file Excel");
            setPreview(result);
            report("Đã kiểm tra file. Hãy xem kết quả trước khi cập nhật.");
          } catch (error) {
            report((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block flex-1">
          File Excel (.xlsx, tối đa 25 MB)
          <input
            className={input}
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </label>
        <button className={button} disabled={busy}>
          Kiểm tra file
        </button>
      </form>
      {preview && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <b>{preview.filename}</b>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
            {[
              ["Sheet", preview.sheets],
              ["Tổng dòng", preview.total],
              ["Cập nhật", preview.updates],
              ["Xuất bản mới", preview.publishable],
              ["Bản nháp", preview.drafts],
              ["Không hợp lệ", preview.invalid],
            ].map(([label, value]) => (
              <div className="rounded border bg-white p-2" key={label}>
                <span className="block text-xs text-slate-500">{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
          {preview.errors.length > 0 && (
            <details className="text-sm text-red-700">
              <summary>Xem lỗi dữ liệu ({preview.invalid})</summary>
              <ul className="mt-2 max-h-48 list-disc overflow-auto pl-5">
                {preview.errors.map((error, index) => (
                  <li key={`${error.sheet}-${error.row}-${index}`}>
                    {error.sheet}, dòng {error.row}, {error.id || "không có id"}
                    : {error.errors.join(", ")}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            className={button}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{
                  updated: number;
                  published: number;
                  drafted: number;
                  skipped: number;
                }>(
                  `/admin/products/import/${preview.token}/commit`,
                  "POST",
                  {},
                );
                report(
                  `Hoàn tất: cập nhật ${result.updated}, xuất bản ${result.published}, tạo nháp ${result.drafted}, bỏ qua ${result.skipped}.`,
                );
                setPreview(null);
                await ctx.refreshCatalog();
                await loadDrafts();
              } catch (error) {
                report((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Xác nhận cập nhật
          </button>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Bản nháp chờ giá và tồn kho</h4>
          <button className="underline" onClick={loadDrafts}>
            Làm mới
          </button>
        </div>
        {!drafts.length && (
          <p className="text-sm text-slate-500">Không có bản nháp.</p>
        )}
        {drafts.map((draft) => (
          <form
            key={draft.id}
            className="grid gap-2 rounded border p-3 md:grid-cols-[1fr_140px_110px_auto]"
            onSubmit={async (event) => {
              event.preventDefault();
              const data = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              setBusy(true);
              try {
                await api(`/admin/product-drafts/${draft.id}/publish`, "POST", {
                  category: data.category,
                  mainImage: data.mainImage,
                  price: Number(data.price),
                  stock: Number(data.stock),
                });
                await ctx.refreshCatalog();
                await loadDrafts();
                report(`Đã xuất bản ${draft.id}.`);
              } catch (error) {
                report((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="min-w-0">
              <b className="block truncate">{draft.productName}</b>
              <span className="text-xs text-slate-500">
                {draft.id} · {draft.brand} · {draft.sourceSheet}
              </span>
            </div>
            <input
              className="border p-2"
              name="price"
              type="number"
              min="1"
              placeholder="Giá bán"
              required
            />
            <input
              className="border p-2"
              name="stock"
              type="number"
              min="0"
              placeholder="Tồn kho"
              required
            />
            <div className="flex gap-2">
              <button className={button} disabled={busy}>
                Xuất bản
              </button>
              <button
                type="button"
                className="border px-3 text-red-700"
                disabled={busy}
                onClick={async () => {
                  await api(`/admin/product-drafts/${draft.id}`, "DELETE");
                  await loadDrafts();
                }}
              >
                Xóa
              </button>
            </div>
            <div className="grid gap-2 md:col-span-4 md:grid-cols-2">
              <label className="text-xs text-slate-600">
                Mã danh mục
                <input
                  className={input}
                  name="category"
                  defaultValue={draft.category || ""}
                  required
                />
              </label>
              <label className="text-xs text-slate-600">
                Ảnh chính HTTPS
                <input
                  className={input}
                  name="mainImage"
                  type="url"
                  defaultValue={draft.mainImage || ""}
                  required
                />
              </label>
            </div>
          </form>
        ))}
        {drafts.length >= 100 && (
          <p className="text-sm text-slate-500">
            Đang hiển thị 100 bản nháp mới nhất.
          </p>
        )}
      </div>
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
