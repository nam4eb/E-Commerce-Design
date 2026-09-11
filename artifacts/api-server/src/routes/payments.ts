import { Router } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  check,
  HttpError,
  publicOrigin,
  remoteJSON,
  type Guards,
  type ShopDB,
} from "../lib/shop-shared";
export function paymentProviders() {
  check(
    !process.env.PAYMENT_ENV ||
      ["sandbox", "production"].includes(process.env.PAYMENT_ENV),
    "PAYMENT_ENV phải là sandbox hoặc production",
  );
  const liveAllowed =
    process.env.PAYMENT_ENV !== "production" ||
    process.env.PAYMENTS_LIVE_ENABLED === "true";
  return {
    cod: true,
    vnpay:
      liveAllowed &&
      Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET),
    momo:
      liveAllowed &&
      Boolean(
        process.env.MOMO_PARTNER_CODE &&
        process.env.MOMO_ACCESS_KEY &&
        process.env.MOMO_SECRET_KEY,
      ),
    environment:
      process.env.PAYMENT_ENV === "production" ? "production" : "sandbox",
  };
}
function equalHex(actual: unknown, expected: string) {
  return (
    typeof actual === "string" &&
    /^[a-f0-9]+$/i.test(actual) &&
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
  );
}
const encode = (value: string) =>
  encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(
      /[!'()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    );
export function vnpCanonical(data: Record<string, string>) {
  return Object.keys(data)
    .filter(
      (k) =>
        k.startsWith("vnp_") &&
        !["vnp_SecureHash", "vnp_SecureHashType"].includes(k),
    )
    .sort()
    .map((k) => `${encode(k)}=${encode(data[k])}`)
    .join("&");
}
export function vnpSignature(data: Record<string, string>, secret: string) {
  return createHmac("sha512", secret).update(vnpCanonical(data)).digest("hex");
}
export function momoSignature(data: Record<string, unknown>, secret: string) {
  return createHmac("sha256", secret)
    .update(
      Object.keys(data)
        .sort()
        .map((k) => `${k}=${data[k]}`)
        .join("&"),
    )
    .digest("hex");
}
const momoFields = [
  "amount",
  "extraData",
  "message",
  "orderId",
  "orderInfo",
  "orderType",
  "partnerCode",
  "payType",
  "requestId",
  "responseTime",
  "resultCode",
  "transId",
];
const stamp = (time: number) =>
  new Date(time + 7 * 3600000).toISOString().replace(/[-:T]/g, "").slice(0, 14);

async function settle(
  db: ShopDB,
  provider: string,
  reference: string,
  amount: number,
  success: boolean,
  transactionId: string,
) {
  return db.transaction(async (q) => {
    const payment = (
      await q(
        "SELECT * FROM shop_payments WHERE reference=$1 AND provider=$2",
        [reference, provider],
      )
    )[0];
    if (!payment) return "missing";
    if (Number(payment.amount) !== amount) return "amount";
    const order = (
      await q("UPDATE shop_orders SET status=status WHERE id=$1 RETURNING *", [
        payment.order_id,
      ])
    )[0];
    const current = (
      await q("SELECT * FROM shop_payments WHERE reference=$1", [reference])
    )[0];
    if (current.state === "paid") return "duplicate";
    const data = JSON.parse(order.data);
    await q(
      "UPDATE shop_payments SET state=$1,transaction_id=$2,updated_at=$3 WHERE reference=$4",
      [
        success ? "paid" : "failed",
        transactionId,
        new Date().toISOString(),
        reference,
      ],
    );
    data.paymentStatus = success
      ? order.status === "Đã hủy"
        ? "Đã thanh toán - cần hoàn tiền"
        : "Đã thanh toán"
      : "Thanh toán không thành công";
    const status =
      success && order.status === "Chờ thanh toán"
        ? "Chờ xác nhận"
        : order.status;
    await q("UPDATE shop_orders SET data=$1,status=$2 WHERE id=$3", [
      JSON.stringify(data),
      status,
      order.id,
    ]);
    return "ok";
  });
}
export function paymentCallbacks(db: ShopDB) {
  const router = Router();
  // Only these exact endpoints bypass browser CSRF protection; their signatures are mandatory.
  router.get("/payments/vnpay/ipn", async (req, res) => {
    const data = req.query as Record<string, string>;
    if (
      !process.env.VNPAY_HASH_SECRET ||
      Object.values(data).some((v) => typeof v !== "string") ||
      data.vnp_TmnCode !== process.env.VNPAY_TMN_CODE ||
      !equalHex(
        data.vnp_SecureHash,
        vnpSignature(data, process.env.VNPAY_HASH_SECRET),
      )
    ) {
      res.json({ RspCode: "97", Message: "Invalid signature" });
      return;
    }
    const amount = Number(data.vnp_Amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount % 100 !== 0) {
      res.json({ RspCode: "04", Message: "Invalid amount" });
      return;
    }
    if (
      data.vnp_ResponseCode === "00" &&
      data.vnp_TransactionStatus === "00" &&
      !(Number(data.vnp_TransactionNo) > 0)
    ) {
      res.json({ RspCode: "99", Message: "Invalid transaction" });
      return;
    }
    const result = await settle(
      db,
      "vnpay",
      data.vnp_TxnRef,
      amount / 100,
      data.vnp_ResponseCode === "00" && data.vnp_TransactionStatus === "00",
      String(data.vnp_TransactionNo || ""),
    );
    res.json({
      RspCode:
        result === "missing"
          ? "01"
          : result === "amount"
            ? "04"
            : result === "duplicate"
              ? "02"
              : "00",
      Message: result,
    });
  });
  router.post("/payments/momo/ipn", async (req, res) => {
    const body = req.body || {};
    const signed: Record<string, unknown> = {
      accessKey: process.env.MOMO_ACCESS_KEY,
    };
    for (const key of momoFields) signed[key] = body[key];
    if (
      !process.env.MOMO_SECRET_KEY ||
      body.partnerCode !== process.env.MOMO_PARTNER_CODE ||
      momoFields.some((k) => !["string", "number"].includes(typeof body[k])) ||
      !equalHex(
        body.signature,
        momoSignature(signed, process.env.MOMO_SECRET_KEY),
      )
    ) {
      res.status(400).json({ message: "Invalid signature" });
      return;
    }
    const payment = (
      await db.query(
        "SELECT reference FROM shop_payments WHERE reference=$1 AND provider=$2",
        [body.orderId, "momo"],
      )
    )[0];
    if (Number(body.resultCode) === 0 && !(Number(body.transId) > 0)) {
      res.status(400).json({ message: "Invalid transaction" });
      return;
    }
    if (
      !payment ||
      body.requestId !== body.orderId ||
      !Number.isSafeInteger(Number(body.amount))
    ) {
      res.status(400).json({ message: "Invalid transaction" });
      return;
    }
    const result = await settle(
      db,
      "momo",
      String(body.orderId),
      Number(body.amount),
      Number(body.resultCode) === 0,
      String(body.transId),
    );
    if (result === "amount" || result === "missing") {
      res.status(400).json({ message: "Invalid amount or order" });
      return;
    }
    res.status(204).end();
  });
  router.get("/payments/:provider/return", async (req, res) => {
    // A browser return is never proof of payment, even if it includes a success code.
    const ref =
      req.params.provider === "vnpay"
        ? req.query.vnp_TxnRef
        : req.query.orderId;
    const p =
      typeof ref === "string"
        ? (
            await db.query(
              "SELECT order_id FROM shop_payments WHERE reference=$1 AND provider=$2",
              [ref, req.params.provider],
            )
          )[0]
        : null;
    res.redirect(
      p
        ? `${publicOrigin()}/orders/${encodeURIComponent(p.order_id)}`
        : `${publicOrigin()}/account`,
    );
  });
  return router;
}
export function registerPayments(
  router: Router,
  db: ShopDB,
  { auth, admin }: Guards,
) {
  const checks = new Map<string, number>();
  router.post("/orders/:id/payment/check", auth, async (req, res) => {
    const payment = (
      await db.query(
        "SELECT p.* FROM shop_payments p JOIN shop_orders o ON o.id=p.order_id WHERE o.id=$1 AND o.user_id=$2",
        [req.params.id, res.locals.user.id],
      )
    )[0];
    if (!payment) throw new HttpError(404, "Đơn chưa có giao dịch thanh toán");
    if (payment.state === "paid") {
      res.json({ message: "Đã xác nhận thanh toán" });
      return;
    }
    const now = Date.now();
    for (const [id, time] of checks) if (now - time > 60000) checks.delete(id);
    if (now - (checks.get(payment.reference) || 0) < 15000)
      throw new HttpError(429, "Vui lòng chờ 15 giây trước khi kiểm tra lại");
    checks.set(payment.reference, now);
    const live = paymentProviders().environment === "production";
    if (payment.provider === "momo") {
      check(
        process.env.MOMO_SECRET_KEY &&
          process.env.MOMO_ACCESS_KEY &&
          process.env.MOMO_PARTNER_CODE,
        "MoMo chưa được cấu hình",
      );
      const payload = {
        partnerCode: process.env.MOMO_PARTNER_CODE,
        requestId: randomUUID(),
        orderId: payment.reference,
      };
      const result = await remoteJSON(
        `https://${live ? "payment" : "test-payment"}.momo.vn/v2/gateway/api/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            lang: "vi",
            signature: momoSignature(
              { accessKey: process.env.MOMO_ACCESS_KEY, ...payload },
              process.env.MOMO_SECRET_KEY,
            ),
          }),
        },
      );
      check(
        result.partnerCode === payload.partnerCode &&
          result.orderId === payload.orderId &&
          result.requestId === payload.requestId,
        "Phản hồi truy vấn không khớp giao dịch",
      );
      if (result.resultCode === 0) {
        check(
          Number(result.amount) === Number(payment.amount) &&
            Number(result.transId) > 0,
          "Số tiền truy vấn không khớp",
        );
        await settle(
          db,
          "momo",
          payment.reference,
          Number(result.amount),
          true,
          String(result.transId),
        );
        res.json({ message: "Đã xác nhận thanh toán" });
        return;
      }
    } else {
      check(
        process.env.VNPAY_HASH_SECRET &&
          process.env.VNPAY_TMN_CODE &&
          payment.url,
        "VNPAY chưa có thông tin truy vấn",
      );
      const payload: Record<string, string> = {
        vnp_RequestId: randomUUID().replaceAll("-", ""),
        vnp_Version: "2.1.0",
        vnp_Command: "querydr",
        vnp_TmnCode: process.env.VNPAY_TMN_CODE,
        vnp_TxnRef: payment.reference,
        vnp_TransactionDate:
          new URL(payment.url).searchParams.get("vnp_CreateDate") || "",
        vnp_CreateDate: stamp(Date.now()),
        vnp_IpAddr: (
          process.env.VNPAY_QUERY_IP ||
          req.ip ||
          "127.0.0.1"
        ).replace("::ffff:", ""),
        vnp_OrderInfo: `Kiem tra ${payment.reference}`,
      };
      const signature = createHmac("sha512", process.env.VNPAY_HASH_SECRET)
        .update(Object.values(payload).join("|"))
        .digest("hex");
      const result = await remoteJSON(
        `https://${live ? "pay.vnpay.vn" : "sandbox.vnpayment.vn"}/merchant_webapi/api/transaction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, vnp_SecureHash: signature }),
        },
      );
      const fields = [
        "vnp_ResponseId",
        "vnp_Command",
        "vnp_ResponseCode",
        "vnp_Message",
        "vnp_TmnCode",
        "vnp_TxnRef",
        "vnp_Amount",
        "vnp_BankCode",
        "vnp_PayDate",
        "vnp_TransactionNo",
        "vnp_TransactionType",
        "vnp_TransactionStatus",
        "vnp_OrderInfo",
        "vnp_PromotionCode",
        "vnp_PromotionAmount",
      ];
      const expected = createHmac("sha512", process.env.VNPAY_HASH_SECRET)
        .update(fields.map((k) => result[k] ?? "").join("|"))
        .digest("hex");
      check(
        equalHex(result.vnp_SecureHash, expected) &&
          result.vnp_TmnCode === payload.vnp_TmnCode &&
          result.vnp_TxnRef === payment.reference,
        "Chữ ký phản hồi truy vấn không hợp lệ",
      );
      if (
        result.vnp_ResponseCode === "00" &&
        result.vnp_TransactionStatus === "00"
      ) {
        check(
          Number(result.vnp_Amount) === Number(payment.amount) * 100 &&
            Number(result.vnp_TransactionNo) > 0,
          "Số tiền truy vấn không khớp",
        );
        await settle(
          db,
          "vnpay",
          payment.reference,
          Number(payment.amount),
          true,
          String(result.vnp_TransactionNo),
        );
        res.json({ message: "Đã xác nhận thanh toán" });
        return;
      }
    }
    res.json({
      message:
        "Cổng thanh toán chưa xác nhận thành công. Kiểm tra sau hoặc liên hệ hỗ trợ.",
    });
  });
  router.post("/orders/:id/payment", auth, async (req, res) => {
    const providers = paymentProviders();
    const payment = await db.transaction<{
      order_id: string;
      provider: string;
      reference: string;
      amount: number;
      state: string;
      url: string;
      existing: boolean;
    }>(async (q) => {
      const order = (
        await q(
          "UPDATE shop_orders SET status=status WHERE id=$1 AND user_id=$2 RETURNING *",
          [req.params.id, res.locals.user.id],
        )
      )[0];
      if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng");
      const data = JSON.parse(order.data);
      const provider = String(data.method);
      check(
        (provider === "vnpay" || provider === "momo") &&
          providers[provider as "vnpay" | "momo"],
        "Cổng thanh toán chưa được bật",
      );
      check(
        order.status === "Chờ thanh toán",
        "Đơn hàng không còn chờ thanh toán",
      );
      const existing = (
        await q("SELECT * FROM shop_payments WHERE order_id=$1", [order.id])
      )[0];
      if (existing)
        return {
          order_id: existing.order_id,
          provider: existing.provider,
          reference: existing.reference,
          amount: Number(existing.amount),
          state: existing.state,
          url: existing.url,
          existing: true,
        };
      check(
        Number.isSafeInteger(data.total) &&
          data.total >= 1000 &&
          data.total <= 9999999999,
        "Giá trị đơn không phù hợp với thanh toán online",
      );
      const p = {
        order_id: order.id,
        provider,
        reference: randomUUID().replaceAll("-", ""),
        amount: data.total,
        state: "creating",
        url: "",
        existing: false,
      };
      await q(
        "INSERT INTO shop_payments (order_id,provider,reference,amount,state,updated_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          p.order_id,
          provider,
          p.reference,
          p.amount,
          p.state,
          new Date().toISOString(),
        ],
      );
      return p;
    });
    if (payment.existing) {
      if (payment.state === "pending" && payment.url) {
        res.json({ url: payment.url });
        return;
      }
      throw new HttpError(
        409,
        payment.state === "failed"
          ? "Giao dịch không thành công. Hãy hủy đơn này trước khi đặt lại."
          : "Đang chờ xác nhận giao dịch. Không tạo thanh toán mới; kiểm tra lại đơn hoặc liên hệ hỗ trợ.",
      );
    }
    try {
      let url: string;
      if (payment.provider === "vnpay") {
        const params: Record<string, string> = {
          vnp_Version: "2.1.0",
          vnp_Command: "pay",
          vnp_TmnCode: process.env.VNPAY_TMN_CODE!,
          vnp_Amount: String(payment.amount * 100),
          vnp_CurrCode: "VND",
          vnp_TxnRef: payment.reference,
          vnp_OrderInfo: `Thanh toan don hang ${payment.reference}`,
          vnp_OrderType: "other",
          vnp_Locale: "vn",
          vnp_ReturnUrl: `${publicOrigin()}/api/payments/vnpay/return`,
          vnp_IpAddr: (req.ip || "127.0.0.1").replace("::ffff:", ""),
          vnp_CreateDate: stamp(Date.now()),
          vnp_ExpireDate: stamp(Date.now() + 15 * 60000),
        };
        const base =
          providers.environment === "production"
            ? "https://pay.vnpay.vn/vpcpay.html"
            : "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        url = `${base}?${vnpCanonical(params)}&vnp_SecureHash=${vnpSignature(params, process.env.VNPAY_HASH_SECRET!)}`;
      } else {
        const payload = {
          partnerCode: process.env.MOMO_PARTNER_CODE!,
          requestId: payment.reference,
          orderId: payment.reference,
          amount: payment.amount,
          orderInfo: `Thanh toan ${payment.reference}`,
          redirectUrl: `${publicOrigin()}/api/payments/momo/return`,
          ipnUrl: `${publicOrigin()}/api/payments/momo/ipn`,
          requestType: "captureWallet",
          extraData: "",
        };
        const signature = momoSignature(
          { accessKey: process.env.MOMO_ACCESS_KEY!, ...payload },
          process.env.MOMO_SECRET_KEY!,
        );
        const result = await remoteJSON(
          `https://${providers.environment === "production" ? "payment" : "test-payment"}.momo.vn/v2/gateway/api/create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              signature,
              autoCapture: true,
              lang: "vi",
            }),
          },
        );
        check(
          result.resultCode === 0 && typeof result.payUrl === "string",
          "MoMo chưa tạo được liên kết thanh toán. Vui lòng kiểm tra trạng thái đơn.",
        );
        const target = new URL(result.payUrl);
        check(
          target.protocol === "https:" &&
            ["payment.momo.vn", "test-payment.momo.vn"].includes(
              target.hostname,
            ),
          "Địa chỉ thanh toán không hợp lệ",
        );
        url = result.payUrl;
      }
      const saved = await db.query(
        "UPDATE shop_payments SET url=$1,state='pending',updated_at=$2 WHERE reference=$3 AND state='creating' RETURNING *",
        [url, new Date().toISOString(), payment.reference],
      );
      if (!saved.length)
        throw new HttpError(
          409,
          "Trạng thái thanh toán đã thay đổi. Vui lòng tải lại đơn.",
        );
      res.json({ url });
    } catch (error) {
      await db.query(
        "UPDATE shop_payments SET state='unknown',updated_at=$1 WHERE reference=$2 AND state='creating'",
        [new Date().toISOString(), payment.reference],
      );
      throw error;
    }
  });
  router.post(
    "/admin/orders/:id/collect-cod",
    auth,
    admin,
    async (req, res) => {
      const order = await db.transaction(async (q) => {
        const o = (
          await q(
            "UPDATE shop_orders SET status=status WHERE id=$1 RETURNING *",
            [req.params.id],
          )
        )[0];
        if (!o) throw new HttpError(404, "Không tìm thấy đơn");
        const data = JSON.parse(o.data);
        check(
          data.method === "cod" && o.status === "Đã giao",
          "Chỉ ghi nhận COD cho đơn đã giao",
        );
        data.paymentStatus = "Đã thanh toán";
        await q("UPDATE shop_orders SET data=$1 WHERE id=$2", [
          JSON.stringify(data),
          o.id,
        ]);
        return { ...data, status: o.status };
      });
      res.json(order);
    },
  );
}
