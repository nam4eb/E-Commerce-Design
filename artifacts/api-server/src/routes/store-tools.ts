import type { Router } from "express";
import { randomUUID } from "node:crypto";
import { check, HttpError, type Guards, type ShopDB } from "../lib/shop-shared";
import { pages, news } from "../data/content-seed";
const clean = (v: unknown, max = 1000) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
export async function registerStoreTools(
  router: Router,
  db: ShopDB,
  { auth, admin }: Guards,
) {
  await db.transaction(async (q) => {
    const marker = await q(
      "INSERT INTO shop_content (kind,id,data) VALUES ('system','content-seed','{}') ON CONFLICT(kind,id) DO NOTHING RETURNING id",
    );
    if (!marker.length) return;
    for (const [kind, items] of [
      ["page", pages],
      ["article", news],
    ] as const)
      for (const item of items)
        await q(
          "INSERT INTO shop_content (kind,id,data) VALUES ($1,$2,$3) ON CONFLICT(kind,id) DO NOTHING",
          [kind, item.id, JSON.stringify(item)],
        );
  });
  router.get("/content/:kind", async (req, res) => {
    check(
      ["page", "article", "store", "promotion"].includes(
        String(req.params.kind),
      ),
      "Loại nội dung không hợp lệ",
    );
    res.json(
      (
        await db.query(
          "SELECT data FROM shop_content WHERE kind=$1 ORDER BY id",
          [req.params.kind],
        )
      ).map((r) => JSON.parse(r.data)),
    );
  });
  router.get("/products/:id/reviews", async (req, res) => {
    res.json(
      await db.query(
        "SELECT r.rating,r.body,r.created_at,u.name FROM shop_reviews r JOIN shop_users u ON u.id=r.user_id WHERE r.product_id=$1 ORDER BY r.created_at DESC",
        [req.params.id],
      ),
    );
  });
  router.post("/products/:id/reviews", auth, async (req, res) => {
    const rating = req.body.rating,
      body = clean(req.body.body, 3000);
    check(
      Number.isInteger(rating) &&
        rating >= 1 &&
        rating <= 5 &&
        body.length >= 10,
      "Nhập đánh giá 1–5 sao và nội dung từ 10 ký tự",
    );
    const orders = await db.query(
      "SELECT data FROM shop_orders WHERE user_id=$1 AND status='Đã giao'",
      [res.locals.user.id],
    );
    check(
      orders.some((o) =>
        JSON.parse(o.data).items.some(
          (i: { id: string }) => i.id === req.params.id,
        ),
      ),
      "Chỉ khách đã nhận sản phẩm này được đánh giá",
    );
    await db.query(
      "INSERT INTO shop_reviews (product_id,user_id,rating,body,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(product_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,created_at=excluded.created_at",
      [
        req.params.id,
        res.locals.user.id,
        rating,
        body,
        new Date().toISOString(),
      ],
    );
    res.json({ ok: true });
  });
  router.post("/newsletter", async (req, res) => {
    const email = clean(req.body.email, 200).toLowerCase();
    check(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && req.body.consent === true,
      "Nhập email hợp lệ và đồng ý nhận tin",
    );
    await db.query(
      "INSERT INTO shop_subscribers (email,created_at,active) VALUES ($1,$2,1) ON CONFLICT(email) DO UPDATE SET active=1",
      [email, new Date().toISOString()],
    );
    res.json({ ok: true });
  });
  router.delete("/newsletter", auth, async (_req, res) => {
    await db.query("UPDATE shop_subscribers SET active=0 WHERE email=$1", [
      res.locals.user.email,
    ]);
    res.json({ ok: true });
  });
  router.get("/support", auth, async (_req, res) => {
    res.json(
      await db.query(
        "SELECT * FROM shop_support WHERE user_id=$1 ORDER BY created_at DESC",
        [res.locals.user.id],
      ),
    );
  });
  router.post("/support", auth, async (req, res) => {
    const subject = clean(req.body.subject, 200),
      body = clean(req.body.body, 5000);
    check(
      subject.length >= 3 && body.length >= 10,
      "Nhập chủ đề và nội dung yêu cầu",
    );
    const id = randomUUID();
    await db.query(
      "INSERT INTO shop_support (id,user_id,subject,body,created_at) VALUES ($1,$2,$3,$4,$5)",
      [id, res.locals.user.id, subject, body, new Date().toISOString()],
    );
    res.status(201).json({ id });
  });
  router.get("/admin/support", auth, admin, async (_req, res) => {
    res.json(
      await db.query("SELECT * FROM shop_support ORDER BY created_at DESC"),
    );
  });
  router.patch("/admin/support/:id", auth, admin, async (req, res) => {
    const reply = clean(req.body.reply, 5000);
    check(reply.length >= 3, "Nhập phản hồi");
    const rows = await db.query(
      "UPDATE shop_support SET reply=$1,status='Đã phản hồi' WHERE id=$2 RETURNING id",
      [reply, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, "Không tìm thấy yêu cầu");
    res.json({ ok: true });
  });
  router.get("/admin/customers", auth, admin, async (_req, res) => {
    res.json(
      await db.query(
        "SELECT id,email,name,phone,address,role FROM shop_users ORDER BY name",
      ),
    );
  });
  router.get("/admin/subscribers", auth, admin, async (_req, res) => {
    res.json(
      await db.query(
        "SELECT email,created_at FROM shop_subscribers WHERE active=1 ORDER BY created_at DESC",
      ),
    );
  });
  router.put("/admin/content/:kind/:id", auth, admin, async (req, res) => {
    const kind = String(req.params.kind),
      id = String(req.params.id);
    check(
      ["page", "article", "store", "promotion"].includes(kind) &&
        /^[a-z0-9-]{1,80}$/.test(id),
      "Mã hoặc loại nội dung không hợp lệ",
    );
    const data = {
      id,
      title: clean(req.body.title, 200),
      body: clean(req.body.body, 15000),
      image: clean(req.body.image, 1000),
      categoryId: clean(req.body.categoryId, 80),
      endsAt: clean(req.body.endsAt, 50),
      productIds: Array.isArray(req.body.productIds)
        ? req.body.productIds
            .filter((s: unknown) => typeof s === "string")
            .slice(0, 100)
        : [],
    };
    check(
      data.title.length >= 3 && data.body.length >= 10,
      "Nhập tiêu đề và nội dung",
    );
    check(!data.image || /^https:\/\//.test(data.image), "Ảnh phải dùng HTTPS");
    if (kind === "promotion") {
      check(Number.isFinite(Date.parse(data.endsAt)), "Nhập ngày kết thúc");
      const ids = new Set(
        (await db.query("SELECT id FROM shop_products")).map((p) => p.id),
      );
      check(
        data.productIds.every((id: string) => ids.has(id)),
        "Sản phẩm khuyến mãi không tồn tại",
      );
    }
    await db.query(
      "INSERT INTO shop_content (kind,id,data) VALUES ($1,$2,$3) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
      [kind, id, JSON.stringify(data)],
    );
    res.json(data);
  });
  router.delete("/admin/content/:kind/:id", auth, admin, async (req, res) => {
    await db.query("DELETE FROM shop_content WHERE kind=$1 AND id=$2", [
      req.params.kind,
      req.params.id,
    ]);
    res.json({ ok: true });
  });
  router.post("/admin/products", auth, admin, async (req, res) => {
    const p = req.body;
    check(
      /^[a-z0-9-]{1,80}$/.test(p.id || "") &&
        clean(p.name).length >= 3 &&
        clean(p.brand).length > 0 &&
        clean(p.categoryId).length > 0,
      "Nhập mã, tên, thương hiệu và danh mục",
    );
    check(
      Number.isInteger(p.price) &&
        p.price > 0 &&
        p.price <= 1000000000 &&
        Number.isInteger(p.stock) &&
        p.stock >= 0 &&
        p.stock <= 1000000,
      "Giá hoặc tồn kho không hợp lệ",
    );
    check(/^https:\/\//.test(p.image || ""), "Ảnh sản phẩm phải dùng HTTPS");
    const data = {
      id: p.id,
      name: clean(p.name, 200),
      brand: clean(p.brand, 100),
      categoryId: clean(p.categoryId, 80),
      category: clean(p.category, 100) || p.categoryId,
      price: p.price,
      oldPrice: p.price,
      rating: 0,
      reviews: 0,
      discount: 0,
      image: p.image,
      gallery: [p.image],
      stock: p.stock,
      sold: 0,
      specs: [],
      tags: [],
    };
    const rows = await db.query(
      "INSERT INTO shop_products (id,data,price,stock) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id",
      [data.id, JSON.stringify(data), data.price, data.stock],
    );
    check(rows.length, "Mã sản phẩm đã tồn tại");
    res.status(201).json(data);
  });
  router.post("/orders/:id/cancel", auth, async (req, res) => {
    const result = await db.transaction(async (q) => {
      const o = (
        await q(
          "UPDATE shop_orders SET status=status WHERE id=$1 AND user_id=$2 RETURNING *",
          [req.params.id, res.locals.user.id],
        )
      )[0];
      if (!o) throw new HttpError(404, "Không tìm thấy đơn");
      check(
        ["Chờ xác nhận", "Chờ thanh toán"].includes(o.status),
        "Đơn đã xử lý; vui lòng gửi yêu cầu hỗ trợ",
      );
      const data = JSON.parse(o.data);
      if (data.paymentStatus === "Đã thanh toán")
        data.paymentStatus = "Đã thanh toán - cần hoàn tiền";
      await q("UPDATE shop_orders SET status='Đã hủy',data=$1 WHERE id=$2", [
        JSON.stringify(data),
        o.id,
      ]);
      for (const i of data.items)
        await q("UPDATE shop_products SET stock=stock+$1 WHERE id=$2", [
          i.qty,
          i.id,
        ]);
      return { ...data, status: "Đã hủy" };
    });
    res.json(result);
  });
}
