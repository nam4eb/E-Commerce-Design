import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { openCommerceDatabase, type Row } from "@workspace/db/commerce";
import { products } from "../data/catalog-seed";

import { HttpError, check, publicOrigin } from "../lib/shop-shared";
import { registerSocialAuth, socialProviders } from "./social-auth";
import {
  registerPayments,
  paymentCallbacks,
  paymentProviders,
} from "./payments";
import { registerStoreTools } from "./store-tools";
import { aiConfig, registerAiChat } from "./ai-chat";
const scrypt = promisify(scryptCallback);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
const publicUser = (u: Row) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  address: u.address,
  role: u.role,
  wishlist: JSON.parse(u.wishlist),
});
const productData = (p: Row) => ({
  ...JSON.parse(p.data),
  price: p.price,
  stock: p.stock,
});
const orderData = (o: Row) => ({ ...JSON.parse(o.data), status: o.status });
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString("hex")}`;
}
async function passwordMatches(password: string, stored: string) {
  if (!stored.includes(":")) return false;
  const [salt, digest] = stored.split(":");
  const calculated = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(calculated, Buffer.from(digest, "hex"));
}

export async function commerceRouter() {
  const db = await openCommerceDatabase();
  if (process.env.SEED_CATALOG === "true") {
    for (const p of products)
      await db.query(
        "INSERT INTO shop_products (id,data,price,stock) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING",
        [p.id, JSON.stringify(p), p.price, p.stock],
      );
  }
  // Admin provisioning is explicit and never upgrades an existing customer account.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    check(
      process.env.ADMIN_PASSWORD.length >= 12,
      "ADMIN_PASSWORD phải có ít nhất 12 ký tự",
    );
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const existing = (
      await db.query("SELECT role FROM shop_users WHERE email=$1", [email])
    )[0];
    if (existing && existing.role !== "admin")
      throw new Error(
        "ADMIN_EMAIL belongs to an existing customer. Choose another email.",
      );
    if (!existing)
      await db.query(
        "INSERT INTO shop_users (id,email,password,name,role) VALUES ($1,$2,$3,$4,$5)",
        [
          randomUUID(),
          email,
          await passwordHash(process.env.ADMIN_PASSWORD),
          "Quản trị viên",
          "admin",
        ],
      );
  }
  publicOrigin();
  const router = Router();
  router.use(paymentCallbacks(db));
  const attempts = new Map<string, { count: number; until: number }>();
  router.use((req, _res, next) => {
    req.body ??= {};
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (req.get("x-store-request") !== "1" ||
        req.get("sec-fetch-site") === "cross-site")
    )
      return next(new HttpError(403, "Yêu cầu không hợp lệ"));
    next();
  });
  router.use(async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      const token = req.headers.cookie
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("shop_session="))
        ?.slice(13);
      if (token)
        res.locals.user = (
          await db.query(
            "SELECT u.* FROM shop_users u JOIN shop_sessions s ON s.user_id=u.id WHERE s.token=$1 AND s.expires>$2",
            [hash(token), Date.now()],
          )
        )[0];
      next();
    } catch (error) {
      next(error);
    }
  });
  const auth = (_req: Request, res: Response, next: NextFunction) =>
    res.locals.user ? next() : next(new HttpError(401, "Vui lòng đăng nhập"));
  const admin = (_req: Request, res: Response, next: NextFunction) =>
    res.locals.user?.role === "admin"
      ? next()
      : next(new HttpError(403, "Bạn không có quyền quản trị"));
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  async function session(res: Response, user: Row, redirect?: string) {
    const token = randomBytes(32).toString("hex");
    await db.query("DELETE FROM shop_sessions WHERE expires<$1", [Date.now()]);
    await db.query(
      "INSERT INTO shop_sessions (token,user_id,expires) VALUES ($1,$2,$3)",
      [hash(token), user.id, Date.now() + 7 * 86400000],
    );
    res.cookie("shop_session", token, {
      ...cookieOptions,
      maxAge: 7 * 86400000,
    });
    if (redirect) res.redirect(publicOrigin() + redirect);
    else res.json(publicUser(user));
  }
  registerSocialAuth(router, db, session);
  registerPayments(router, db, { auth, admin });
  await registerStoreTools(router, db, { auth, admin });
  registerAiChat(router, db, { auth, admin });
  router.get("/config", (_req, res) =>
    res.json({
      social: socialProviders(),
      payments: paymentProviders(),
      ai: aiConfig(),
      contact: {
        phone: process.env.CONTACT_PHONE || "",
        zalo: process.env.CONTACT_ZALO_URL || "",
        facebook: process.env.CONTACT_FACEBOOK_URL || "",
      },
    }),
  );
  router.get("/products", async (_req, res) => {
    const ratings = await db.query(
      "SELECT product_id,AVG(rating) AS rating,COUNT(*) AS reviews FROM shop_reviews GROUP BY product_id",
    );
    const sales = new Map<string, number>();
    for (const row of await db.query(
      "SELECT data FROM shop_orders WHERE status='Đã giao'",
    ))
      for (const item of JSON.parse(row.data).items)
        sales.set(item.id, (sales.get(item.id) || 0) + item.qty);
    res.json(
      (await db.query("SELECT * FROM shop_products ORDER BY id")).map((row) => {
        const p = productData(row);
        const r = ratings.find((r) => r.product_id === p.id);
        return {
          ...p,
          rating: Number(r?.rating || 0),
          reviews: Number(r?.reviews || 0),
          sold: sales.get(p.id) || 0,
        };
      }),
    );
  });
  router.get("/auth/me", (req, res) => {
    res.json(res.locals.user ? publicUser(res.locals.user) : null);
  });
  router.post(["/auth/login", "/auth/register"], async (req, res) => {
    const now = Date.now();
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key);
    const key = req.ip || "unknown";
    const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
    attempts.set(key, attempt);
    if (++attempt.count > 30) throw new HttpError(429, "Thử lại sau 15 phút");
    const email = text(req.body.email).toLowerCase();
    const password = req.body.password;
    check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Email không hợp lệ");
    check(
      typeof password === "string" &&
        password.length >= 10 &&
        password.length <= 128,
      "Mật khẩu phải có 10–128 ký tự",
    );
    let user = (
      await db.query("SELECT * FROM shop_users WHERE email=$1", [email])
    )[0];
    if (req.path.endsWith("register")) {
      check(text(req.body.name).length >= 2, "Vui lòng nhập họ tên");
      if (user) throw new HttpError(409, "Email đã được sử dụng");
      try {
        user = (
          await db.query(
            "INSERT INTO shop_users (id,email,password,name) VALUES ($1,$2,$3,$4) RETURNING *",
            [
              randomUUID(),
              email,
              await passwordHash(password),
              text(req.body.name),
            ],
          )
        )[0];
      } catch (error) {
        if (
          (await db.query("SELECT id FROM shop_users WHERE email=$1", [email]))
            .length
        )
          throw new HttpError(409, "Email đã được sử dụng");
        throw error;
      }
    } else if (!user || !(await passwordMatches(password, user.password)))
      throw new HttpError(401, "Email hoặc mật khẩu không đúng");
    await session(res, user);
  });
  router.post("/auth/logout", async (req, res) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("shop_session="))
      ?.slice(13);
    if (token)
      await db.query("DELETE FROM shop_sessions WHERE token=$1", [hash(token)]);
    res.clearCookie("shop_session", cookieOptions);
    res.json({ ok: true });
  });
  router.patch("/account", auth, async (req, res) => {
    const name = text(req.body.name);
    const phone = text(req.body.phone, 30);
    const address = text(req.body.address, 500);
    check(name.length >= 2, "Họ tên phải có ít nhất 2 ký tự");
    check(
      !phone || /^(0\d{9}|\+84\d{9})$/.test(phone),
      "Số điện thoại không hợp lệ",
    );
    const user = (
      await db.query(
        "UPDATE shop_users SET name=$1,phone=$2,address=$3 WHERE id=$4 RETURNING *",
        [name, phone, address, res.locals.user.id],
      )
    )[0];
    res.json(publicUser(user));
  });
  router.put("/account/wishlist", auth, async (req, res) => {
    const ids = req.body.ids;
    check(
      Array.isArray(ids) &&
        ids.length <= 200 &&
        ids.every((id) => typeof id === "string"),
      "Danh sách không hợp lệ",
    );
    const valid = new Set(
      (await db.query("SELECT id FROM shop_products")).map((p) => p.id),
    );
    check(
      ids.every((id) => valid.has(id)),
      "Sản phẩm không tồn tại",
    );
    await db.query("UPDATE shop_users SET wishlist=$1 WHERE id=$2", [
      JSON.stringify([...new Set(ids)]),
      res.locals.user.id,
    ]);
    res.json({ ok: true });
  });
  router.get("/orders", auth, async (_req, res) => {
    res.json(
      (
        await db.query(
          "SELECT * FROM shop_orders WHERE user_id=$1 ORDER BY created_at DESC",
          [res.locals.user.id],
        )
      ).map(orderData),
    );
  });
  router.get("/orders/:id", auth, async (req, res) => {
    const o = (
      await db.query("SELECT * FROM shop_orders WHERE id=$1 AND user_id=$2", [
        req.params.id,
        res.locals.user.id,
      ])
    )[0];
    if (!o) throw new HttpError(404, "Không tìm thấy đơn hàng");
    res.json(orderData(o));
  });
  router.post("/orders", auth, async (req, res) => {
    const key = req.get("idempotency-key");
    check(
      key && /^[a-zA-Z0-9-]{16,80}$/.test(key),
      "Thiếu mã xác nhận yêu cầu",
    );
    const recipient = {
      name: text(req.body.recipient?.name),
      phone: text(req.body.recipient?.phone, 30),
      address: text(req.body.recipient?.address, 500),
      city: text(req.body.recipient?.city),
      note: text(req.body.recipient?.note, 1000),
    };
    check(
      recipient.name.length >= 2 &&
        recipient.address.length >= 8 &&
        recipient.city.length >= 2,
      "Vui lòng nhập đầy đủ họ tên, địa chỉ và tỉnh thành",
    );
    check(
      /^(0\d{9}|\+84\d{9})$/.test(recipient.phone),
      "Số điện thoại không hợp lệ",
    );
    check(
      ["cod", "vnpay", "momo"].includes(req.body.method) &&
        paymentProviders()[req.body.method as "cod" | "vnpay" | "momo"],
      "Phương thức thanh toán chưa được cấu hình",
    );
    check(
      typeof req.body.install === "boolean",
      "Lựa chọn lắp đặt không hợp lệ",
    );
    const items = req.body.items;
    check(
      Array.isArray(items) && items.length > 0 && items.length <= 100,
      "Giỏ hàng không hợp lệ",
    );
    check(
      items.every(
        (i) =>
          typeof i.id === "string" &&
          Number.isInteger(i.qty) &&
          i.qty > 0 &&
          i.qty <= 100,
      ),
      "Số lượng không hợp lệ",
    );
    check(
      new Set(items.map((i) => i.id)).size === items.length,
      "Sản phẩm bị trùng",
    );
    const body = JSON.stringify({
      recipient,
      items,
      method: req.body.method,
      install: req.body.install,
      expectedSubtotal: req.body.expectedSubtotal,
    });
    const existingOrder = async () =>
      (
        await db.query(
          "SELECT * FROM shop_orders WHERE user_id=$1 AND request_key=$2",
          [res.locals.user.id, key],
        )
      )[0];
    const repeat = (o: Row) => {
      if (o.request_body !== body)
        throw new HttpError(409, "Mã yêu cầu đã dùng cho đơn khác");
      return orderData(o);
    };
    const previous = await existingOrder();
    if (previous) {
      res.json(repeat(previous));
      return;
    }
    try {
      const order = await db.transaction(async (q) => {
        const lines = [];
        for (const item of [...items].sort((a, b) =>
          a.id.localeCompare(b.id),
        )) {
          const p = (
            await q(
              "UPDATE shop_products SET stock=stock-$1 WHERE id=$2 AND stock >= $1 RETURNING *",
              [item.qty, item.id],
            )
          )[0];
          if (!p)
            throw new HttpError(
              409,
              "Sản phẩm đã hết hoặc không đủ tồn kho. Vui lòng cập nhật giỏ hàng.",
            );
          lines.push({
            id: p.id,
            name: JSON.parse(p.data).name,
            price: p.price,
            qty: item.qty,
          });
        }
        const subtotal = lines.reduce((sum, i) => sum + i.price * i.qty, 0);
        if (
          req.body.expectedSubtotal !== undefined &&
          req.body.expectedSubtotal !== subtotal
        )
          throw new HttpError(
            409,
            "Giá sản phẩm đã thay đổi. Vui lòng kiểm tra tổng tiền mới và xác nhận lại.",
          );
        const shipping = subtotal >= 10000000 ? 0 : 35000;
        const installation = req.body.install ? 250000 : 0;
        const createdAt = new Date().toISOString();
        const data = {
          id: `DM365-${randomUUID()}`,
          createdAt,
          recipient,
          items: lines,
          subtotal,
          shipping,
          installation,
          total: subtotal + shipping + installation,
          method: req.body.method,
          paymentStatus: "Chưa thanh toán",
          status: req.body.method === "cod" ? "Chờ xác nhận" : "Chờ thanh toán",
        };
        await q(
          "INSERT INTO shop_orders (id,user_id,request_key,request_body,data,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [
            data.id,
            res.locals.user.id,
            key,
            body,
            JSON.stringify(data),
            data.status,
            createdAt,
          ],
        );
        return data;
      });
      res.status(201).json(order);
    } catch (error) {
      const existing = await existingOrder();
      if (existing) res.json(repeat(existing));
      else throw error;
    }
  });
  router.get("/admin/orders", auth, admin, async (_req, res) => {
    res.json(
      (
        await db.query("SELECT * FROM shop_orders ORDER BY created_at DESC")
      ).map(orderData),
    );
  });
  router.patch("/admin/orders/:id", auth, admin, async (req, res) => {
    const transitions: Record<string, string[]> = {
      "Chờ thanh toán": ["Đã hủy"],
      "Chờ xác nhận": ["Đã xác nhận", "Đã hủy"],
      "Đã xác nhận": ["Đang giao", "Đã hủy"],
      "Đang giao": ["Đã giao"],
      "Đã giao": [],
      "Đã hủy": [],
    };
    const result = await db.transaction(async (q) => {
      const o = (
        await q(
          "UPDATE shop_orders SET status=status WHERE id=$1 RETURNING *",
          [req.params.id],
        )
      )[0];
      if (!o) throw new HttpError(404, "Không tìm thấy đơn hàng");
      check(
        transitions[o.status]?.includes(req.body.status),
        "Không thể chuyển trạng thái này",
      );
      const changed = await q(
        "UPDATE shop_orders SET status=$1 WHERE id=$2 AND status=$3 RETURNING *",
        [req.body.status, o.id, o.status],
      );
      if (!changed.length)
        throw new HttpError(
          409,
          "Đơn hàng vừa được cập nhật, vui lòng tải lại",
        );
      if (
        req.body.status === "Đã hủy" &&
        JSON.parse(o.data).paymentStatus === "Đã thanh toán"
      ) {
        const data = JSON.parse(o.data);
        data.paymentStatus = "Đã thanh toán - cần hoàn tiền";
        await q("UPDATE shop_orders SET data=$1 WHERE id=$2", [
          JSON.stringify(data),
          o.id,
        ]);
        changed[0].data = JSON.stringify(data);
      }
      if (req.body.status === "Đã hủy")
        for (const item of JSON.parse(o.data).items)
          await q("UPDATE shop_products SET stock=stock+$1 WHERE id=$2", [
            item.qty,
            item.id,
          ]);
      return orderData(changed[0]);
    });
    res.json(result);
  });
  router.patch("/admin/products/:id", auth, admin, async (req, res) => {
    check(
      Number.isInteger(req.body.stock) &&
        req.body.stock >= 0 &&
        req.body.stock <= 1000000,
      "Tồn kho không hợp lệ",
    );
    check(
      Number.isInteger(req.body.price) &&
        req.body.price > 0 &&
        req.body.price <= 1000000000,
      "Giá không hợp lệ",
    );
    const p = (
      await db.query(
        "UPDATE shop_products SET stock=$1,price=$2 WHERE id=$3 RETURNING *",
        [req.body.stock, req.body.price, req.params.id],
      )
    )[0];
    if (!p) throw new HttpError(404, "Không tìm thấy sản phẩm");
    res.json(productData(p));
  });
  router.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof HttpError)
        res.status(error.status).json({ message: error.message });
      else {
        console.error(
          "Commerce request failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        res
          .status(500)
          .json({ message: "Không thể xử lý yêu cầu. Vui lòng thử lại." });
      }
    },
  );
  return { router, close: db.close };
}
