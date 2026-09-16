import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { momoSignature, vnpSignature } from "./src/routes/payments";
import ExcelJS from "exceljs";

export async function integrations(
  t: any,
  call: any,
  customer: string,
  other: string,
  admin: string,
  orderBody: any,
) {
  const originalFetch = globalThis.fetch;
  process.env.VNPAY_TMN_CODE = "TESTMERCHANT";
  process.env.VNPAY_HASH_SECRET = "test-secret";
  process.env.MOMO_PARTNER_CODE = "TESTMOMO";
  process.env.MOMO_ACCESS_KEY = "access";
  process.env.MOMO_SECRET_KEY = "secret";
  process.env.GOOGLE_CLIENT_ID = "client";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  process.env.AI_GATEWAY_API_KEY = "ai-test-key";
  process.env.AI_MODEL = "test/model";
  process.env.FACEBOOK_APP_ID = "fb-app";
  process.env.FACEBOOK_APP_SECRET = "fb-secret";
  process.env.FACEBOOK_GRAPH_VERSION = "v99.0"; // Deliberately mocked version; no live API calls.
  let facebookApp = "wrong";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  let nonce = "",
    audience = "client",
    email = "social@example.test",
    momoRequest: any;
  const response = (body: any) =>
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    });
  globalThis.fetch = async (input: any, init: any) => {
    const url = String(input);
    if (url === "https://ai-gateway.vercel.sh/v1/chat/completions") {
      assert.equal(init.headers.Authorization, "Bearer ai-test-key");
      const payload = JSON.parse(init.body);
      assert.equal(payload.model, "test/model");
      assert.ok(payload.messages[0].content.includes("trợ lý sản phẩm"));
      return response({
        model: "test/model",
        choices: [{ message: { content: "Thông tin chính sách thử nghiệm" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });
    }
    if (url.startsWith("https://graph.facebook.com/v99.0/")) {
      if (url.includes("/oauth/access_token"))
        return response({ access_token: "fb-token" });
      if (url.includes("/debug_token"))
        return response({
          data: {
            is_valid: true,
            app_id: facebookApp,
            expires_at: Date.now() / 1000 + 300,
            user_id: "fb-user",
          },
        });
      return response({ id: "fb-user", name: "Facebook User" });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs")
      return response({
        keys: [
          {
            ...publicKey.export({ format: "jwk" }),
            kid: "test",
            alg: "RS256",
            use: "sig",
          },
        ],
      });
    if (url === "https://oauth2.googleapis.com/token") {
      const jwt = [
        { alg: "RS256", kid: "test" },
        {
          iss: "https://accounts.google.com",
          aud: audience,
          sub: email,
          email,
          email_verified: true,
          name: "Social Tester",
          nonce,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300,
        },
      ]
        .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
        .join(".");
      return response({
        id_token:
          jwt +
          "." +
          sign("RSA-SHA256", Buffer.from(jwt), privateKey).toString(
            "base64url",
          ),
      });
    }
    if (url.includes("test-payment.momo.vn/v2/gateway/api/")) {
      const p = JSON.parse(init.body);
      if (url.endsWith("/create")) {
        momoRequest = p;
        const { signature, autoCapture, lang, ...fields } = p;
        assert.equal(
          signature,
          momoSignature({ accessKey: "access", ...fields }, "secret"),
        );
        return response({
          resultCode: 0,
          payUrl: "https://test-payment.momo.vn/pay/test",
        });
      }
      return response({
        ...p,
        resultCode: 0,
        amount: momoRequest.amount,
        transId: 456,
      });
    }
    return originalFetch(input, init);
  };
  const make = async (method: string) =>
    (
      await call(
        "/orders",
        "POST",
        { ...orderBody, method },
        customer,
        randomUUID(),
      )
    ).body;
  const order = async (id: string) =>
    (await call("/orders/" + id, "GET", undefined, customer)).body;
  try {
    await t.test(
      "AI chatbot uses verified data, sizes rooms and protects saved history",
      async () => {
        const id = randomUUID();
        const before = await call("/ai/chats", "GET", undefined, customer);
        const price = await call("/ai/chat", "POST", {
          message: "ATKF35XVMV giá bao nhiêu?",
        });
        assert.equal(price.status, 200);
        assert.equal(price.body.intent, "PRODUCT_PRICE");
        assert.match(price.body.message, /10\.000\.000/);
        assert.equal(price.body.context.lastProductId, "ac-02");
        const stock = await call("/ai/chat", "POST", {
          message: "Còn hàng không?",
          context: price.body.context,
        });
        assert.equal(stock.body.intent, "PRODUCT_STOCK");
        const currentProduct = (await call("/products")).body.find(
          (item: any) => item.id === "ac-02",
        );
        assert.match(
          stock.body.message,
          currentProduct.stock > 0
            ? new RegExp(`còn ${currentProduct.stock} sản phẩm`, "i")
            : /tạm hết hàng/i,
        );
        const sizing = await call("/ai/chat", "POST", {
          message: "Phòng ngủ 20m2 tầng áp mái hướng Tây dùng điều hòa nào?",
        });
        assert.equal(sizing.body.intent, "AIR_CONDITIONER_HEAT_LOAD");
        assert.equal(sizing.body.recommendation.recommendedBTU, 18000);
        assert.equal(sizing.body.recommendation.heatLoad, "HIGH");
        assert.equal(sizing.body.products[0].productId, "ac-07");
        const bestSeller = await call("/ai/chat", "POST", {
          message: "top những điều hòa Midea bán chạy nhất",
        });
        assert.equal(bestSeller.body.intent, "BEST_SELLER");
        assert.equal(bestSeller.body.responseType, "limitation");
        assert.match(bestSeller.body.message, /chưa có đủ dữ liệu đơn đã giao/i);
        assert.equal(
          (await call("/ai/chats", "GET", undefined, customer)).body.length,
          before.body.length,
        );
        const saved = await call(
          "/ai/chat",
          "POST",
          { conversationId: id, message: "ATKF35XVMV còn hàng không?" },
          customer,
        );
        assert.equal(saved.body.intent, "PRODUCT_STOCK");
        const chat = await call(`/ai/chats/${id}`, "GET", undefined, customer);
        assert.deepEqual(
          chat.body.messages.map((m: any) => m.role),
          ["user", "assistant"],
        );
        assert.equal(
          (await call(`/ai/chats/${id}`, "GET", undefined, other)).status,
          404,
        );
        assert.equal(
          (await call(`/ai/chats/${id}`, "DELETE", undefined, customer)).status,
          200,
        );
        const syncId = randomUUID();
        const synced = await call(
          "/ai/conversations/sync",
          "POST",
          {
            conversationId: syncId,
            messages: [
              { role: "user", content: "Xin chào" },
              { role: "assistant", content: "Xin chào bạn" },
            ],
          },
          customer,
        );
        assert.equal(synced.body.imported, 2);
        assert.equal(
          (await call(`/ai/chats/${syncId}`, "GET", undefined, customer)).body
            .messages.length,
          2,
        );
      },
    );
    await t.test(
      "admin previews Excel imports, updates existing metadata and publishes drafts",
      async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("TestBrand");
        const headers = [
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
        ];
        sheet.addRow(["DANH MỤC SẢN PHẨM"]);
        sheet.addRow([]);
        sheet.addRow([]);
        sheet.addRow(headers);
        sheet.addRow([
          "ac-08",
          "Panasonic",
          "air-conditioner",
          "wall-mounted",
          "Điều hòa Panasonic N9WKH-8 cập nhật",
          "N9WKH-8",
          "N9WKH-8",
          "panasonic-n9wkh-8",
          "Mô tả ngắn",
          "Mô tả dài",
          "Việt Nam",
          '{"duration":12,"unit":"month"}',
          "active",
          "https://example.test/ac-08",
          "https://example.test/ac-08.jpg",
        ]);
        sheet.addRow([
          "excel-new-01",
          "TestBrand",
          "air-conditioner",
          "wall-mounted",
          "Điều hòa TestBrand 12000 BTU",
          "TEST-120",
          "TEST-120",
          "testbrand-test-120",
          "Mô tả ngắn",
          "Mô tả dài",
          "Việt Nam",
          '{"duration":24,"unit":"month"}',
          "active",
          "https://example.test/test-120",
          "https://example.test/test-120.jpg",
        ]);
        const buffer = await workbook.xlsx.writeBuffer();
        const form = new FormData();
        form.append(
          "file",
          new Blob([new Uint8Array(buffer)], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          "products.xlsx",
        );
        const preview = await call(
          "/admin/products/import/preview",
          "POST",
          form,
          admin,
        );
        assert.equal(preview.status, 200);
        assert.equal(preview.body.total, 2);
        assert.equal(preview.body.updates, 1);
        assert.equal(preview.body.drafts, 1);
        const committed = await call(
          `/admin/products/import/${preview.body.token}/commit`,
          "POST",
          {},
          admin,
        );
        assert.deepEqual(committed.body, {
          updated: 1,
          published: 0,
          drafted: 1,
          skipped: 0,
        });
        const draft = (
          await call("/admin/product-drafts", "GET", undefined, admin)
        ).body.find((item: any) => item.id === "excel-new-01");
        assert.equal(draft.model, "TEST-120");
        assert.equal(
          (
            await call(
              "/admin/product-drafts/excel-new-01/publish",
              "POST",
              { price: 9990000, stock: 7 },
              admin,
            )
          ).status,
          200,
        );
        const catalog = (await call("/products")).body;
        assert.equal(
          catalog.find((item: any) => item.id === "excel-new-01").price,
          9990000,
        );
        assert.equal(
          catalog.find((item: any) => item.id === "ac-08").name,
          "Điều hòa Panasonic N9WKH-8 cập nhật",
        );
      },
    );
    await t.test(
      "Facebook rejects another app token and supports identities without email",
      async () => {
        const login = async () => {
          const start = await call("/auth/facebook/start", "POST", {});
          const state = new URL(start.body.url).searchParams.get("state");
          return call(
            "/auth/facebook/callback?code=test&state=" + state,
            "GET",
            undefined,
            start.cookie,
          );
        };
        assert.match((await login()).location, /authError=/);
        facebookApp = "fb-app";
        const result = await login();
        assert.ok(!result.location.includes("authError"));
        const cookie = result.cookies
          .find((c: string) => c.startsWith("shop_session="))
          .split(";")[0];
        const user = (await call("/auth/me", "GET", undefined, cookie)).body;
        assert.match(user.email, /@accounts.invalid$/);
        assert.equal(user.role, "customer");
      },
    );
    await t.test(
      "Google browser binding, signed ID token, audience, replay and explicit linking",
      async () => {
        const start = async (cookie = "", link = false) => {
          const r = await call("/auth/google/start", "POST", { link }, cookie);
          assert.equal(r.status, 200);
          const u = new URL(r.body.url);
          nonce = u.searchParams.get("nonce")!;
          return { ...r, state: u.searchParams.get("state") };
        };
        let s = await start();
        assert.match(
          (await call("/auth/google/callback?code=test&state=" + s.state))
            .location,
          /authError=/,
        );
        audience = "wrong";
        assert.match(
          (
            await call(
              "/auth/google/callback?code=test&state=" + s.state,
              "GET",
              undefined,
              s.cookie,
            )
          ).location,
          /authError=/,
        );
        audience = "client";
        s = await start();
        const logged = await call(
          "/auth/google/callback?code=test&state=" + s.state,
          "GET",
          undefined,
          s.cookie,
        );
        assert.ok(
          logged.cookies.some((v: string) => v.startsWith("shop_session=")),
        );
        assert.match(
          (
            await call(
              "/auth/google/callback?code=test&state=" + s.state,
              "GET",
              undefined,
              s.cookie,
            )
          ).location,
          /authError=/,
        );
        email = "customer@example.test";
        s = await start();
        assert.match(
          (
            await call(
              "/auth/google/callback?code=test&state=" + s.state,
              "GET",
              undefined,
              s.cookie,
            )
          ).location,
          /authError=/,
        );
        s = await start(customer, true);
        const linked = await call(
          "/auth/google/callback?code=test&state=" + s.state,
          "GET",
          undefined,
          customer + "; " + s.cookie,
        );
        assert.ok(!linked.location.includes("authError"));
        assert.deepEqual(
          (await call("/account/identities", "GET", undefined, customer)).body,
          ["google"],
        );
      },
    );
    await t.test(
      "VNPAY signature, amount, return spoof, duplicate and late success after cancellation",
      async () => {
        const o = await make("vnpay");
        const pay = await call(`/orders/${o.id}/payment`, "POST", {}, customer);
        assert.equal(pay.status, 200);
        const params = Object.fromEntries(new URL(pay.body.url).searchParams);
        assert.equal(
          params.vnp_SecureHash,
          vnpSignature(params, "test-secret"),
        );
        const cb: any = {
          vnp_TmnCode: "TESTMERCHANT",
          vnp_TxnRef: params.vnp_TxnRef,
          vnp_Amount: String(o.total * 100),
          vnp_ResponseCode: "00",
          vnp_TransactionStatus: "00",
          vnp_TransactionNo: "123",
        };
        const ipn = async (data: any) =>
          call(
            "/payments/vnpay/ipn?" +
              new URLSearchParams({
                ...data,
                vnp_SecureHash: vnpSignature(data, "test-secret"),
              }),
          );
        await call(
          "/payments/vnpay/return?vnp_TxnRef=" +
            params.vnp_TxnRef +
            "&vnp_ResponseCode=00",
        );
        assert.equal((await order(o.id)).status, "Chờ thanh toán");
        assert.equal(
          (
            await call(
              "/payments/vnpay/ipn?" +
                new URLSearchParams({ ...cb, vnp_SecureHash: "bad" }),
            )
          ).body.RspCode,
          "97",
        );
        assert.equal(
          (await ipn({ ...cb, vnp_Amount: "100" })).body.RspCode,
          "04",
        );
        assert.equal(
          (await call(`/orders/${o.id}/payment`, "POST", {}, other)).status,
          404,
        );
        await call(`/orders/${o.id}/cancel`, "POST", {}, customer);
        assert.equal((await ipn(cb)).body.RspCode, "00");
        assert.equal(
          (await order(o.id)).paymentStatus,
          "Đã thanh toán - cần hoàn tiền",
        );
        assert.equal(
          (await ipn({ ...cb, vnp_ResponseCode: "24" })).body.RspCode,
          "02",
        );
        assert.equal((await order(o.id)).status, "Đã hủy");
      },
    );
    await t.test(
      "MoMo create signature, invalid IPN, successful settlement and server reconciliation",
      async () => {
        const o = await make("momo");
        assert.equal(
          (await call(`/orders/${o.id}/payment`, "POST", {}, customer)).status,
          200,
        );
        const payload: any = {
          partnerCode: "TESTMOMO",
          orderId: momoRequest.orderId,
          requestId: momoRequest.requestId,
          amount: o.total,
          extraData: "",
          message: "Success",
          orderInfo: momoRequest.orderInfo,
          orderType: "momo_wallet",
          payType: "qr",
          responseTime: Date.now(),
          resultCode: 0,
          transId: 123,
        };
        assert.equal(
          (
            await call(
              "/payments/momo/ipn",
              "POST",
              { ...payload, signature: "bad" },
              "",
              undefined,
              false,
            )
          ).status,
          400,
        );
        const signature = momoSignature(
          { accessKey: "access", ...payload },
          "secret",
        );
        assert.equal(
          (
            await call(
              "/payments/momo/ipn",
              "POST",
              { ...payload, signature },
              "",
              undefined,
              false,
            )
          ).status,
          204,
        );
        assert.equal((await order(o.id)).status, "Chờ xác nhận");
        const second = await make("momo");
        await call(`/orders/${second.id}/payment`, "POST", {}, customer);
        assert.equal(
          (
            await call(
              `/orders/${second.id}/payment/check`,
              "POST",
              {},
              customer,
            )
          ).status,
          200,
        );
        assert.equal((await order(second.id)).paymentStatus, "Đã thanh toán");
      },
    );
    await t.test(
      "Support isolation, admin reply, consent, content CRUD and verified buyer reviews",
      async () => {
        assert.equal(
          (
            await call("/newsletter", "POST", {
              email: "customer@example.test",
            })
          ).status,
          400,
        );
        await call("/newsletter", "POST", {
          email: "customer@example.test",
          consent: true,
        });
        assert.equal(
          (await call("/admin/subscribers", "GET", undefined, admin)).body
            .length,
          1,
        );
        await call("/newsletter", "DELETE", {}, customer);
        assert.equal(
          (await call("/admin/subscribers", "GET", undefined, admin)).body
            .length,
          0,
        );
        const ticket = await call(
          "/support",
          "POST",
          { subject: "Cần hỗ trợ", body: "Hỗ trợ kiểm tra đơn hàng" },
          customer,
        );
        assert.equal(
          (await call("/support", "GET", undefined, other)).body.length,
          0,
        );
        await call(
          "/admin/support/" + ticket.body.id,
          "PATCH",
          { reply: "Đã kiểm tra yêu cầu" },
          admin,
        );
        assert.equal(
          (await call("/support", "GET", undefined, customer)).body[0].reply,
          "Đã kiểm tra yêu cầu",
        );
        assert.equal(
          (
            await call(
              "/admin/content/page/test",
              "PUT",
              { title: "Test page", body: "Nội dung kiểm thử" },
              customer,
            )
          ).status,
          403,
        );
        await call(
          "/admin/content/page/test",
          "PUT",
          { title: "Test page", body: "Nội dung kiểm thử" },
          admin,
        );
        assert.ok(
          (await call("/content/page")).body.some((p: any) => p.id === "test"),
        );
        await call("/admin/content/page/test", "DELETE", {}, admin);
        assert.ok(
          !(await call("/content/page")).body.some((p: any) => p.id === "test"),
        );
        assert.equal(
          (
            await call(
              "/products/ac-01/reviews",
              "POST",
              { rating: 5, body: "Sản phẩm hoạt động tốt" },
              customer,
            )
          ).status,
          400,
        );
        const o = await make("cod");
        for (const status of ["Đã xác nhận", "Đang giao", "Đã giao"])
          assert.equal(
            (await call("/admin/orders/" + o.id, "PATCH", { status }, admin))
              .status,
            200,
          );
        assert.equal(
          (
            await call(
              "/products/ac-01/reviews",
              "POST",
              { rating: 4, body: "Sản phẩm hoạt động tốt" },
              customer,
            )
          ).status,
          200,
        );
        const p = (await call("/products")).body.find(
          (p: any) => p.id === "ac-01",
        );
        assert.equal(p.rating, 4);
        assert.equal(p.reviews, 1);
        assert.ok(p.sold >= 1);
        assert.equal(
          (
            await call(
              "/admin/orders/" + o.id + "/collect-cod",
              "POST",
              {},
              admin,
            )
          ).status,
          200,
        );
        assert.equal((await order(o.id)).paymentStatus, "Đã thanh toán");
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}
