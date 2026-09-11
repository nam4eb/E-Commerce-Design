export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  role: "admin" | "customer";
  wishlist: string[];
};
export type ShopOrder = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  method: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    note: string;
  };
  items: { id: string; name: string; price: number; qty: number }[];
  subtotal: number;
  shipping: number;
  installation: number;
  total: number;
};
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Store-Request": "1",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Máy chủ trả về dữ liệu không hợp lệ" }));
  if (!response.ok)
    throw new Error(data.message || "Không thể kết nối máy chủ");
  return data as T;
}
export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function saveStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode may disable storage. */
  }
}
