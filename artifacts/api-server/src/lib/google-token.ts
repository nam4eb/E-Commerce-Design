import { createPublicKey, verify } from "node:crypto";
import { check, remoteJSON } from "./shop-shared";

// Keys are fetched only from Google's fixed HTTPS endpoint, never from JWT headers.
export async function googleIdentity(
  token: unknown,
  audience: string,
  nonce: string,
) {
  check(
    typeof token === "string" && token.length < 20000,
    "Google không trả về ID token hợp lệ",
  );
  const parts = (token as string).split(".");
  check(parts.length === 3, "ID token không hợp lệ");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  check(
    header.alg === "RS256" && typeof header.kid === "string",
    "Thuật toán ID token không hợp lệ",
  );
  const jwks = await remoteJSON("https://www.googleapis.com/oauth2/v3/certs");
  const key = jwks.keys?.find(
    (k: any) =>
      k.kid === header.kid &&
      k.kty === "RSA" &&
      k.alg === "RS256" &&
      k.use === "sig",
  );
  check(
    key &&
      verify(
        "RSA-SHA256",
        Buffer.from(parts[0] + "." + parts[1]),
        createPublicKey({ key, format: "jwk" }),
        Buffer.from(parts[2], "base64url"),
      ),
    "Chữ ký ID token không hợp lệ",
  );
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  const now = Date.now() / 1000;
  check(
    ["https://accounts.google.com", "accounts.google.com"].includes(
      claims.iss,
    ) &&
      claims.aud === audience &&
      (!claims.azp || claims.azp === audience),
    "ID token không thuộc ứng dụng",
  );
  check(
    typeof claims.exp === "number" &&
      claims.exp > now &&
      typeof claims.iat === "number" &&
      claims.iat <= now + 60 &&
      claims.nonce === nonce,
    "ID token hết hạn hoặc không khớp phiên",
  );
  check(
    typeof claims.sub === "string" && claims.sub.length > 0,
    "Google không trả về định danh hợp lệ",
  );
  return claims;
}
