import { integrations } from "./test-integrations";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import { commerceRouter } from "./src/routes/commerce";
import { openCommerceDatabase } from "@workspace/db/commerce";

test("Commerce integration: authentication, orders, stock and administration", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "shop-test-"));
  delete process.env.DATABASE_URL;
  process.env.DATABASE_FILE = join(dir, "shop.sqlite");
  process.env.NODE_ENV = "test";
  process.env.SEED_CATALOG = "true";
  process.env.ADMIN_EMAIL = "admin@example.test";
  process.env.ADMIN_PASSWORD = randomUUID();
  const commerce = await commerceRouter();
  const app = express();
  app.use(express.json());
  app.use("/api", commerce.router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api`;
  async function call(
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    key?: string,
    safe = true,
  ) {
    const res = await fetch(base + path, {
      method,
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        ...(safe ? { "x-store-request": "1" } : {}),
        cookie,
        ...(key ? { "idempotency-key": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return {
      status: res.status,
      body: parsed,
      text,
      location: res.headers.get("location") || "",
      cookies: res.headers.getSetCookie(),
      cookie: res.headers.get("set-cookie")?.split(";")[0] || "",
      rawCookie: res.headers.get("set-cookie") || "",
    };
  }
  let customer = "";
  let other = "";
  let admin = "";
  let orderId = "";
  const recipient = {
    name: "Người kiểm thử",
    phone: "0901234567",
    address: "123 Đường thử nghiệm",
    city: "Hồ Chí Minh",
    note: "",
  };
  const body = {
    recipient,
    method: "cod",
    install: false,
    items: [{ id: "ac-01", qty: 1 }],
  };
  try {
    await t.test(
      "unauthenticated and cross-site writes are rejected",
      async () => {
        assert.equal((await call("/orders")).status, 401);
        assert.equal(
          (await call("/auth/register", "POST", {}, "", undefined, false))
            .status,
          403,
        );
        assert.equal((await call("/auth/me")).body, null);
      },
    );
    await t.test(
      "registration, login, cookie session and account persistence",
      async () => {
        const first = await call("/auth/register", "POST", {
          name: "Customer",
          email: "customer@example.test",
          password: "test-password-123",
          role: "admin",
        });
        assert.equal(first.status, 200);
        assert.equal(first.body.role, "customer");
        assert.ok(!first.body.password);
        assert.match(first.rawCookie, /HttpOnly/);
        assert.match(first.rawCookie, /SameSite=Lax/);
        customer = first.cookie;
        assert.equal(
          (
            await call("/auth/register", "POST", {
              name: "Customer",
              email: "customer@example.test",
              password: "test-password-123",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await call("/auth/login", "POST", {
              email: "customer@example.test",
              password: "incorrect-password",
            })
          ).status,
          401,
        );
        other = (
          await call("/auth/register", "POST", {
            name: "Other",
            email: "other@example.test",
            password: "test-password-123",
          })
        ).cookie;
        const updated = await call(
          "/account",
          "PATCH",
          {
            name: "Updated Name",
            phone: recipient.phone,
            address: recipient.address,
            role: "admin",
          },
          customer,
        );
        assert.equal(updated.body.name, "Updated Name");
        assert.equal(updated.body.role, "customer");
        await call("/account/wishlist", "PUT", { ids: ["ac-01"] }, customer);
        assert.deepEqual(
          (await call("/auth/me", "GET", undefined, customer)).body.wishlist,
          ["ac-01"],
        );
        admin = (
          await call("/auth/login", "POST", {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
          })
        ).cookie;
        assert.ok(admin);
      },
    );
    await t.test(
      "reject invalid recipient, quantity, unavailable payment and insufficient stock",
      async () => {
        for (const data of [
          { ...body, recipient: {} },
          { ...body, method: "card" },
          { ...body, items: [] },
          { ...body, items: [{ id: "ac-01", qty: -1 }] },
        ])
          assert.equal(
            (await call("/orders", "POST", data, customer, randomUUID()))
              .status,
            400,
          );
        assert.equal(
          (
            await call(
              "/orders",
              "POST",
              { ...body, items: [{ id: "ac-01", qty: 99 }] },
              customer,
              randomUUID(),
            )
          ).status,
          409,
        );
      },
    );
    await t.test(
      "server pricing, stock decrement, idempotency and order isolation",
      async () => {
        const key = randomUUID();
        const data = {
          ...body,
          total: 1,
          items: [{ id: "ac-01", qty: 1, price: 1 }],
        };
        const placed = await call("/orders", "POST", data, customer, key);
        assert.equal(placed.status, 201);
        assert.equal(placed.body.total, 10490000);
        assert.equal(placed.body.shipping, 0);
        orderId = placed.body.id;
        const repeat = await call("/orders", "POST", data, customer, key);
        assert.equal(repeat.body.id, orderId);
        assert.equal(
          (await call("/products")).body.find((p: any) => p.id === "ac-01")
            .stock,
          11,
        );
        assert.equal(
          (
            await call(
              "/orders",
              "POST",
              { ...data, install: true },
              customer,
              key,
            )
          ).status,
          409,
        );
        assert.equal(
          (await call(`/orders/${orderId}`, "GET", undefined, other)).status,
          404,
        );
        assert.equal(
          (await call("/orders", "GET", undefined, other)).body.length,
          0,
        );
        assert.equal(
          (await call("/orders", "GET", undefined, customer)).body.length,
          1,
        );
        assert.equal(
          (await call("/admin/orders", "GET", undefined, customer)).status,
          403,
        );
        assert.equal(
          (
            await call(
              "/admin/products/ac-01",
              "PATCH",
              { stock: 999, price: 1 },
              customer,
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "multi-item failure rolls back earlier stock changes",
      async () => {
        const result = await call(
          "/orders",
          "POST",
          {
            ...body,
            items: [
              { id: "ac-01", qty: 1 },
              { id: "zzz-missing", qty: 1 },
            ],
          },
          customer,
          randomUUID(),
        );
        assert.equal(result.status, 409);
        assert.equal(
          (await call("/products")).body.find((p: any) => p.id === "ac-01")
            .stock,
          11,
        );
      },
    );
    await t.test(
      "price changes require reconfirmation and do not reserve stock",
      async () => {
        const result = await call(
          "/orders",
          "POST",
          { ...body, expectedSubtotal: 1 },
          customer,
          randomUUID(),
        );
        assert.equal(result.status, 409);
        assert.equal(
          (await call("/products")).body.find((p: any) => p.id === "ac-01")
            .stock,
          11,
        );
      },
    );
    await t.test(
      "concurrent checkout cannot oversell the last unit",
      async () => {
        await call(
          "/admin/products/ac-02",
          "PATCH",
          { stock: 1, price: 10000000 },
          admin,
        );
        const results = await Promise.all(
          [customer, other].map((cookie) =>
            call(
              "/orders",
              "POST",
              { ...body, items: [{ id: "ac-02", qty: 1 }] },
              cookie,
              randomUUID(),
            ),
          ),
        );
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
        assert.equal(results.find((r) => r.status === 201)!.body.shipping, 0);
        assert.equal(
          (await call("/products")).body.find((p: any) => p.id === "ac-02")
            .stock,
          0,
        );
      },
    );
    await t.test(
      "concurrent retry creates one order and reserves stock once",
      async () => {
        const key = randomUUID();
        const result = await Promise.all(
          [1, 2].map(() =>
            call(
              "/orders",
              "POST",
              { ...body, items: [{ id: "ac-03", qty: 1 }] },
              customer,
              key,
            ),
          ),
        );
        assert.ok(result.every((r) => r.status === 200 || r.status === 201));
        assert.equal(result[0].body.id, result[1].body.id);
        assert.equal(
          (await call("/products")).body.find((p: any) => p.id === "ac-03")
            .stock,
          11,
        );
      },
    );
    await t.test(
      "admin cancellation restores inventory exactly once",
      async () => {
        assert.equal(
          (
            await call(
              `/admin/orders/${orderId}`,
              "PATCH",
              { status: "Đã giao" },
              admin,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              `/admin/orders/${orderId}`,
              "PATCH",
              { status: "Đã hủy" },
              admin,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await call(
              `/admin/orders/${orderId}`,
              "PATCH",
              { status: "Đã hủy" },
              admin,
            )
          ).status,
          400,
        );
        assert.equal(
          (await call("/products")).body.find((p: any) => p.id === "ac-01")
            .stock,
          12,
        );
      },
    );
    await integrations(t, call, customer, other, admin, body);
    await t.test("logout invalidates the server session", async () => {
      assert.equal(
        (await call("/auth/logout", "POST", {}, customer)).status,
        200,
      );
      assert.equal(
        (await call("/orders", "GET", undefined, customer)).status,
        401,
      );
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await commerce.close();
  }
  try {
    await t.test("data survives database reopen", async () => {
      const db = await openCommerceDatabase();
      try {
        const rows = await db.query("SELECT * FROM shop_orders WHERE id=$1", [
          orderId,
        ]);
        assert.equal(rows[0].status, "Đã hủy");
        assert.ok((await db.query("SELECT * FROM shop_users")).length >= 3);
      } finally {
        await db.close();
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
