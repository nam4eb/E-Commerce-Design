import { randomUUID } from "node:crypto";
import type { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { check, HttpError, type Guards, type ShopDB } from "../lib/shop-shared";

const requiredHeaders = [
  "id",
  "brand",
  "category",
  "subcategory",
  "product_name",
  "model",
  "sku",
  "slug",
  "short_description",
  "description",
  "origin",
  "warranty",
  "status",
  "source_url",
  "main_image",
] as const;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) =>
    done(
      null,
      file.originalname.toLowerCase().endsWith(".xlsx") &&
        file.mimetype !== "application/vnd.ms-excel",
    ),
});

type ImportedRow = {
  sheet: string;
  row: number;
  id: string;
  brand: string;
  category: string;
  subcategory: string;
  productName: string;
  model: string;
  sku: string;
  slug: string;
  shortDescription: string;
  description: string;
  origin: string;
  warranty: string;
  status: string;
  sourceUrl: string;
  mainImage: string;
  price?: number;
  oldPrice?: number;
  stock?: number;
  errors: string[];
  exists: boolean;
};
type Preview = {
  ownerId: string;
  filename: string;
  createdAt: number;
  rows: ImportedRow[];
};
const previews = new Map<string, Preview>();

function expirePreviews() {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [id, preview] of previews)
    if (preview.createdAt < cutoff) previews.delete(id);
}

function text(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, max);
}

function integer(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function categoryName(id: string) {
  return (
    (
      {
        "air-conditioner": "Điều hòa",
        refrigerator: "Tủ lạnh",
        freezer: "Tủ đông",
        "washing-machine": "Máy giặt",
        television: "Tivi",
        kitchen: "Nhà bếp",
        "water-heater": "Máy nước nóng",
        vacuum: "Máy hút bụi",
        fan: "Quạt điện",
      } as Record<string, string>
    )[id] || id
  );
}

function productData(row: ImportedRow, current: Record<string, unknown> = {}) {
  const image = row.mainImage || String(current.image || "");
  const modelTags = [row.model, row.sku, row.subcategory].filter(Boolean);
  return {
    ...current,
    id: row.id,
    name: row.productName,
    brand: row.brand,
    categoryId: row.category,
    category: categoryName(row.category),
    subcategory: row.subcategory,
    model: row.model,
    sku: row.sku,
    slug: row.slug || row.id,
    shortDescription: row.shortDescription,
    description: row.description,
    origin: row.origin,
    warranty: row.warranty,
    status: row.status || "active",
    sourceUrl: row.sourceUrl,
    image,
    gallery: image ? [image] : [],
    oldPrice: row.oldPrice || current.oldPrice || row.price || current.price,
    specs: Array.isArray(current.specs) ? current.specs : [],
    tags: [
      ...new Set([
        ...(Array.isArray(current.tags) ? current.tags.map(String) : []),
        ...modelTags,
      ]),
    ],
  };
}

export async function parseProductWorkbook(buffer: Buffer, db: ShopDB) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    raw: false,
    cellFormula: false,
    cellHTML: false,
  });
  check(workbook.SheetNames.length > 0, "File Excel không có worksheet");
  const existing = new Set(
    (await db.query("SELECT id FROM shop_products")).map((row) => row.id),
  );
  const seen = new Set<string>();
  const rows: ImportedRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const headers = new Map<string, number>();
    for (const [column, cell] of (values[3] || []).entries()) {
      const name = String(cell ?? "")
        .trim()
        .toLowerCase();
      if (name) headers.set(name, column);
    }
    const missing = requiredHeaders.filter((name) => !headers.has(name));
    check(
      !missing.length,
      `Sheet ${sheetName} thiếu cột: ${missing.join(", ")}`,
    );
    const value = (row: unknown[], name: string) => {
      const column = headers.get(name);
      return column === undefined ? "" : row[column];
    };
    for (const [index, excelRow] of values.slice(4).entries()) {
      const number = index + 5;
      if (!String(value(excelRow, "id")).trim()) continue;
      const imported: ImportedRow = {
        sheet: text(sheetName, 100),
        row: number,
        id: text(value(excelRow, "id"), 100).toLowerCase(),
        brand: text(value(excelRow, "brand"), 100),
        category: text(value(excelRow, "category"), 80).toLowerCase(),
        subcategory: text(value(excelRow, "subcategory"), 100),
        productName: text(value(excelRow, "product_name"), 300),
        model: text(value(excelRow, "model"), 150),
        sku: text(value(excelRow, "sku"), 150),
        slug: text(value(excelRow, "slug"), 300),
        shortDescription: text(value(excelRow, "short_description"), 3000),
        description: text(value(excelRow, "description"), 20_000),
        origin: text(value(excelRow, "origin"), 150),
        warranty: text(value(excelRow, "warranty"), 1000),
        status: text(value(excelRow, "status"), 30).toLowerCase(),
        sourceUrl: text(value(excelRow, "source_url"), 1500),
        mainImage: text(value(excelRow, "main_image"), 1500),
        price: integer(value(excelRow, "price")),
        oldPrice: integer(value(excelRow, "old_price")),
        stock: integer(value(excelRow, "stock")),
        errors: [],
        exists: existing.has(text(value(excelRow, "id"), 100).toLowerCase()),
      };
      if (!/^[a-z0-9-]{1,100}$/.test(imported.id))
        imported.errors.push("id không hợp lệ");
      if (seen.has(imported.id)) imported.errors.push("id bị trùng trong file");
      seen.add(imported.id);
      if (!imported.brand) imported.errors.push("thiếu brand");
      if (!imported.productName) imported.errors.push("thiếu product_name");
      if (imported.sourceUrl && !/^https:\/\//i.test(imported.sourceUrl))
        imported.errors.push("source_url phải dùng HTTPS");
      if (imported.mainImage && !/^https:\/\//i.test(imported.mainImage))
        imported.errors.push("main_image phải dùng HTTPS");
      if (
        imported.price !== undefined &&
        (!Number.isInteger(imported.price) ||
          imported.price <= 0 ||
          imported.price > 1_000_000_000)
      )
        imported.errors.push("price không hợp lệ");
      if (
        imported.stock !== undefined &&
        (!Number.isInteger(imported.stock) ||
          imported.stock < 0 ||
          imported.stock > 1_000_000)
      )
        imported.errors.push("stock không hợp lệ");
      rows.push(imported);
    }
  }
  check(
    rows.length > 0 && rows.length <= 5000,
    "File phải có từ 1 đến 5.000 sản phẩm",
  );
  return rows;
}

export async function commitProductRows(
  db: ShopDB,
  rows: ImportedRow[],
  batch: string,
) {
  let updated = 0,
    published = 0,
    drafted = 0,
    skipped = 0;
  await db.transaction(async (q) => {
    for (const row of rows) {
      if (row.errors.length) {
        skipped++;
        continue;
      }
      const existing = (
        await q("SELECT data,price,stock FROM shop_products WHERE id=$1", [
          row.id,
        ])
      )[0];
      if (existing) {
        const current = JSON.parse(existing.data);
        const price = row.price ?? Number(existing.price);
        const stock = row.stock ?? Number(existing.stock);
        await q(
          "UPDATE shop_products SET data=$1,price=$2,stock=$3 WHERE id=$4",
          [JSON.stringify(productData(row, current)), price, stock, row.id],
        );
        updated++;
      } else if (
        row.price !== undefined &&
        row.stock !== undefined &&
        row.category &&
        row.mainImage
      ) {
        await q(
          "INSERT INTO shop_products (id,data,price,stock) VALUES ($1,$2,$3,$4)",
          [row.id, JSON.stringify(productData(row)), row.price, row.stock],
        );
        published++;
      } else {
        await q(
          "INSERT INTO shop_product_drafts (id,data,source_sheet,import_batch,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET data=excluded.data,source_sheet=excluded.source_sheet,import_batch=excluded.import_batch,created_at=excluded.created_at",
          [
            row.id,
            JSON.stringify(row),
            row.sheet,
            batch,
            new Date().toISOString(),
          ],
        );
        drafted++;
      }
    }
  });
  return { updated, published, drafted, skipped };
}

export function registerProductImport(
  router: Router,
  db: ShopDB,
  { auth, admin }: Guards,
) {
  router.post(
    "/admin/products/import/preview",
    auth,
    admin,
    upload.single("file"),
    async (req, res) => {
      check(req.file, "Chọn file .xlsx hợp lệ, tối đa 25 MB");
      expirePreviews();
      const rows = await parseProductWorkbook(req.file.buffer, db);
      const token = randomUUID();
      previews.set(token, {
        ownerId: res.locals.user.id,
        filename: req.file.originalname,
        createdAt: Date.now(),
        rows,
      });
      const invalid = rows.filter((row) => row.errors.length);
      res.json({
        token,
        filename: req.file.originalname,
        sheets: [...new Set(rows.map((row) => row.sheet))].length,
        total: rows.length,
        updates: rows.filter((row) => row.exists && !row.errors.length).length,
        publishable: rows.filter(
          (row) =>
            !row.exists &&
            row.price !== undefined &&
            row.stock !== undefined &&
            row.category &&
            row.mainImage &&
            !row.errors.length,
        ).length,
        drafts: rows.filter(
          (row) =>
            !row.exists &&
            !(
              row.price !== undefined &&
              row.stock !== undefined &&
              row.category &&
              row.mainImage
            ) &&
            !row.errors.length,
        ).length,
        invalid: invalid.length,
        errors: invalid.slice(0, 100).map((row) => ({
          sheet: row.sheet,
          row: row.row,
          id: row.id,
          errors: row.errors,
        })),
      });
    },
  );

  router.post(
    "/admin/products/import/:token/commit",
    auth,
    admin,
    async (req, res) => {
      expirePreviews();
      const token = String(req.params.token);
      const preview = previews.get(token);
      if (!preview || preview.ownerId !== res.locals.user.id)
        throw new HttpError(
          404,
          "Bản xem trước đã hết hạn; vui lòng tải lại file",
        );
      const result = await commitProductRows(db, preview.rows, token);
      previews.delete(token);
      res.json(result);
    },
  );

  router.get("/admin/product-drafts", auth, admin, async (_req, res) => {
    res.json(
      (
        await db.query(
          "SELECT id,data,source_sheet,created_at FROM shop_product_drafts ORDER BY created_at DESC LIMIT 100",
        )
      ).map((row) => ({
        ...JSON.parse(row.data),
        id: row.id,
        sourceSheet: row.source_sheet,
        createdAt: row.created_at,
      })),
    );
  });

  router.post(
    "/admin/product-drafts/:id/publish",
    auth,
    admin,
    async (req, res) => {
      const draft = (
        await db.query("SELECT data FROM shop_product_drafts WHERE id=$1", [
          req.params.id,
        ])
      )[0];
      if (!draft) throw new HttpError(404, "Không tìm thấy bản nháp");
      const row = JSON.parse(draft.data) as ImportedRow;
      row.category = text(req.body.category || row.category, 80);
      row.mainImage = text(req.body.mainImage || row.mainImage, 1500);
      const price = Number(req.body.price),
        stock = Number(req.body.stock);
      check(
        row.category && /^https:\/\//i.test(row.mainImage),
        "Cần danh mục và ảnh HTTPS",
      );
      check(
        Number.isInteger(price) &&
          price > 0 &&
          price <= 1_000_000_000 &&
          Number.isInteger(stock) &&
          stock >= 0 &&
          stock <= 1_000_000,
        "Giá hoặc tồn kho không hợp lệ",
      );
      await db.transaction(async (q) => {
        await q(
          "INSERT INTO shop_products (id,data,price,stock) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET data=excluded.data,price=excluded.price,stock=excluded.stock",
          [
            row.id,
            JSON.stringify(productData({ ...row, price, stock })),
            price,
            stock,
          ],
        );
        await q("DELETE FROM shop_product_drafts WHERE id=$1", [row.id]);
      });
      res.json({ id: row.id });
    },
  );

  router.delete("/admin/product-drafts/:id", auth, admin, async (req, res) => {
    await db.query("DELETE FROM shop_product_drafts WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ ok: true });
  });
}
