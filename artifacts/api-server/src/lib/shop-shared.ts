import type { RequestHandler, Response } from "express";
import type { openCommerceDatabase, Row } from "@workspace/db/commerce";
export type ShopDB = Awaited<ReturnType<typeof openCommerceDatabase>>;
export type Guards = { auth: RequestHandler; admin: RequestHandler };
export type SessionWriter = (
  res: Response,
  user: Row,
  redirect?: string,
) => Promise<void>;
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function check(value: unknown, message: string): asserts value {
  if (!value) throw new HttpError(400, message);
}
export function publicOrigin() {
  const value = process.env.PUBLIC_ORIGIN || "http://localhost:5173";
  const url = new URL(value);
  if (
    url.origin !== value ||
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new Error(
      "PUBLIC_ORIGIN must be an HTTPS origin (localhost HTTP allowed in development)",
    );
  return value;
}
export async function remoteJSON(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(35000),
    redirect: "error",
  });
  const body = (await response.json()) as Record<string, any>;
  if (!response.ok || body.error)
    throw new HttpError(
      502,
      "Dịch vụ bên ngoài chưa xử lý được yêu cầu. Vui lòng thử lại.",
    );
  return body;
}
