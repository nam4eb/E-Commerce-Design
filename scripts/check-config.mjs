import { existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"));
const env = process.env;
let errors = 0;
function report(name, ok, hint) {
  console.log(`${ok ? "OK" : "THIẾU/SAI"}: ${name}${ok ? "" : " — " + hint}`);
  if (!ok) errors++;
}
const origin = env.PUBLIC_ORIGIN || "http://localhost:5173";
try {
  const u = new URL(origin);
  report(
    "PUBLIC_ORIGIN",
    u.origin === origin &&
      (u.protocol === "https:" ||
        (env.NODE_ENV !== "production" &&
          u.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(u.hostname))),
    "Origin HTTPS, không có đường dẫn/dấu / cuối",
  );
} catch {
  report("PUBLIC_ORIGIN", false, "URL không hợp lệ");
}
report(
  "Database",
  Boolean(
    env.DATABASE_URL || (env.NODE_ENV !== "production" && env.DATABASE_FILE),
  ),
  "Đặt DATABASE_URL hoặc DATABASE_FILE cho development",
);
report(
  "PAYMENT_ENV",
  ["sandbox", "production"].includes(env.PAYMENT_ENV || "sandbox"),
  "Dùng sandbox hoặc production",
);
for (const [name, keys] of Object.entries({
  Google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  Facebook: [
    "FACEBOOK_APP_ID",
    "FACEBOOK_APP_SECRET",
    "FACEBOOK_GRAPH_VERSION",
  ],
  VNPAY: ["VNPAY_TMN_CODE", "VNPAY_HASH_SECRET"],
  MoMo: ["MOMO_PARTNER_CODE", "MOMO_ACCESS_KEY", "MOMO_SECRET_KEY"],
  "AI chatbot": ["AI_GATEWAY_API_KEY", "AI_MODEL"],
})) {
  if (!keys.some((k) => env[k])) {
    console.log(`TẮT: ${name} (chưa cấu hình)`);
    continue;
  }
  report(
    name,
    keys.every((k) => Boolean(env[k])),
    `Cần ${keys.join(", ")}`,
  );
}
if (env.FACEBOOK_GRAPH_VERSION)
  report(
    "Facebook Graph version",
    /^v\d+\.0$/.test(env.FACEBOOK_GRAPH_VERSION),
    "Lấy phiên bản ứng dụng trong Meta Developers, dạng vNN.0",
  );
if (env.PAYMENT_ENV === "production")
  report(
    "Cho phép thanh toán thật",
    env.PAYMENTS_LIVE_ENABLED === "true",
    "Chỉ đặt true sau khi có merchant production và nghiệm thu",
  );
console.log(
  "\nĐịa chỉ callback (không kiểm tra kết nối hoặc tính hợp lệ của khóa):",
);
for (const path of [
  "/api/auth/google/callback",
  "/api/auth/facebook/callback",
  "/api/payments/vnpay/return",
  "/api/payments/vnpay/ipn",
  "/api/payments/momo/return",
  "/api/payments/momo/ipn",
  "/pages/privacy",
  "/pages/data-deletion",
])
  console.log(origin + path);
process.exitCode = errors ? 1 : 0;
