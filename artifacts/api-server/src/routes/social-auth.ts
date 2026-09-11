import type { Router } from "express";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  check,
  HttpError,
  publicOrigin,
  remoteJSON,
  type SessionWriter,
  type ShopDB,
} from "../lib/shop-shared";
import { googleIdentity } from "../lib/google-token";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export function socialProviders() {
  return {
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    facebook: Boolean(
      process.env.FACEBOOK_APP_ID &&
      process.env.FACEBOOK_APP_SECRET &&
      /^v\d+\.0$/.test(process.env.FACEBOOK_GRAPH_VERSION || ""),
    ),
  };
}
export function registerSocialAuth(
  router: Router,
  db: ShopDB,
  session: SessionWriter,
) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600000,
  };
  router.post("/auth/:provider/start", async (req, res) => {
    const provider = String(req.params.provider);
    check(
      (provider === "google" || provider === "facebook") &&
        socialProviders()[provider],
      "Phương thức đăng nhập chưa được cấu hình",
    );
    if (req.body.link && !res.locals.user)
      throw new HttpError(401, "Đăng nhập trước khi liên kết");
    const state = randomBytes(32).toString("hex");
    const browser = randomBytes(32).toString("hex");
    const verifier = randomBytes(48).toString("base64url");
    await db.query("DELETE FROM shop_oauth_states WHERE expires<$1", [
      Date.now(),
    ]);
    await db.query(
      "INSERT INTO shop_oauth_states (state,browser_hash,provider,verifier,user_id,expires) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        digest(state),
        digest(browser),
        provider,
        verifier,
        req.body.link ? res.locals.user.id : null,
        Date.now() + 600000,
      ],
    );
    res.cookie("shop_oauth", browser, options);
    const params = new URLSearchParams({
      client_id:
        provider === "google"
          ? process.env.GOOGLE_CLIENT_ID!
          : process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${publicOrigin()}/api/auth/${provider}/callback`,
      response_type: "code",
      state,
      scope:
        provider === "google" ? "openid email profile" : "public_profile,email",
    });
    if (provider === "google") {
      params.set("nonce", digest(verifier));
      params.set("code_challenge_method", "S256");
      params.set(
        "code_challenge",
        createHash("sha256").update(verifier).digest("base64url"),
      );
    }
    const endpoint =
      provider === "google"
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : `https://www.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION}/dialog/oauth`;
    res.json({ url: endpoint + "?" + params });
  });
  router.get("/auth/:provider/callback", async (req, res) => {
    try {
      const provider = String(req.params.provider);
      check(
        (provider === "google" || provider === "facebook") &&
          socialProviders()[provider],
        "Phương thức đăng nhập chưa được cấu hình",
      );
      const browser = req.headers.cookie
        ?.split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("shop_oauth="))
        ?.slice(11);
      check(
        typeof req.query.state === "string" && browser,
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
      );
      const state = (
        await db.query(
          "DELETE FROM shop_oauth_states WHERE state=$1 AND browser_hash=$2 AND provider=$3 AND expires>$4 RETURNING *",
          [digest(req.query.state), digest(browser), provider, Date.now()],
        )
      )[0];
      check(state, "Phiên đăng nhập không hợp lệ hoặc đã được sử dụng");
      res.clearCookie("shop_oauth", options);
      check(
        !req.query.error && typeof req.query.code === "string",
        "Bạn đã hủy hoặc từ chối đăng nhập",
      );
      if (state.user_id && state.user_id !== res.locals.user?.id)
        throw new HttpError(
          401,
          "Phiên tài khoản đã thay đổi. Đăng nhập và liên kết lại.",
        );
      const redirect = `${publicOrigin()}/api/auth/${provider}/callback`;
      let subject: string, name: string, email: string;
      if (provider === "google") {
        const tokens = await remoteJSON("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: req.query.code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: redirect,
            grant_type: "authorization_code",
            code_verifier: state.verifier,
          }),
        });
        const profile = await googleIdentity(
          tokens.id_token,
          process.env.GOOGLE_CLIENT_ID!,
          digest(state.verifier),
        );
        subject = profile.sub;
        name = String(profile.name || "Khách hàng Google").slice(0, 200);
        email =
          profile.email_verified === true
            ? String(profile.email || "").toLowerCase()
            : "";
      } else {
        const base = `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION}`;
        const tokens = await remoteJSON(`${base}/oauth/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.FACEBOOK_APP_ID!,
            client_secret: process.env.FACEBOOK_APP_SECRET!,
            redirect_uri: redirect,
            code: req.query.code,
          }),
        });
        check(
          typeof tokens.access_token === "string",
          "Không nhận được quyền đăng nhập Facebook",
        );
        const debug = await remoteJSON(
          `${base}/debug_token?${new URLSearchParams({ input_token: tokens.access_token })}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`,
            },
          },
        );
        check(
          debug.data?.is_valid === true &&
            String(debug.data.app_id) === process.env.FACEBOOK_APP_ID &&
            Number(debug.data.expires_at) > Date.now() / 1000,
          "Token Facebook không hợp lệ",
        );
        const proof = createHmac("sha256", process.env.FACEBOOK_APP_SECRET!)
          .update(tokens.access_token)
          .digest("hex");
        const profile = await remoteJSON(
          `${base}/me?${new URLSearchParams({ fields: "id,name,email", appsecret_proof: proof })}`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } },
        );
        check(
          typeof profile.id === "string" && profile.id === debug.data.user_id,
          "Định danh Facebook không khớp",
        );
        subject = profile.id;
        name = String(profile.name || "Khách hàng Facebook").slice(0, 200);
        email = String(profile.email || "").toLowerCase();
      }
      const user = await db.transaction(async (q) => {
        const identity = (
          await q(
            "SELECT user_id FROM shop_identities WHERE provider=$1 AND subject=$2",
            [provider, subject],
          )
        )[0];
        if (identity) {
          if (state.user_id && identity.user_id !== state.user_id)
            throw new HttpError(
              409,
              "Tài khoản mạng xã hội đã được liên kết với người khác",
            );
          return (
            await q("SELECT * FROM shop_users WHERE id=$1", [identity.user_id])
          )[0];
        }
        let userId = state.user_id;
        if (userId)
          check(
            !(
              await q(
                "SELECT subject FROM shop_identities WHERE provider=$1 AND user_id=$2",
                [provider, userId],
              )
            ).length,
            "Bạn đã liên kết nhà cung cấp này",
          );
        else {
          if (
            email &&
            (await q("SELECT id FROM shop_users WHERE email=$1", [email]))
              .length
          )
            throw new HttpError(
              409,
              "Email đã có tài khoản. Hãy đăng nhập bằng phương thức cũ, rồi chọn Liên kết trong tài khoản.",
            );
          userId = randomUUID();
          await q(
            "INSERT INTO shop_users (id,email,password,name) VALUES ($1,$2,$3,$4)",
            [
              userId,
              email || `${provider}-${digest(subject)}@accounts.invalid`,
              "!social-only",
              name,
            ],
          );
        }
        await q(
          "INSERT INTO shop_identities (provider,subject,user_id) VALUES ($1,$2,$3)",
          [provider, subject, userId],
        );
        return (await q("SELECT * FROM shop_users WHERE id=$1", [userId]))[0];
      });
      await session(res, user, "/account");
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : "Đăng nhập chưa thành công. Vui lòng thử lại.";
      res.redirect(
        `${publicOrigin()}/account?authError=${encodeURIComponent(message)}`,
      );
    }
  });
  router.get("/account/identities", async (_req, res) => {
    if (!res.locals.user) throw new HttpError(401, "Vui lòng đăng nhập");
    res.json(
      (
        await db.query(
          "SELECT provider FROM shop_identities WHERE user_id=$1",
          [res.locals.user.id],
        )
      ).map((i) => i.provider),
    );
  });
}
