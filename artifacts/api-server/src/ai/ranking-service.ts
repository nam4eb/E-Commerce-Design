import type { ShopDB } from "../lib/shop-shared";
import { listProducts, type StoreProduct } from "./product-service";

export interface RankingQuery {
  categoryId?: string;
  brandId?: string;
  timeWindow?: "30d" | "all";
  limit?: number;
}

export type RankingResult =
  | { available: false; reason: "NO_VERIFIED_SALES_METRIC" }
  | {
      available: true;
      source: "DELIVERED_ORDER_ITEM_QUANTITY";
      products: Array<StoreProduct & { unitsSold: number }>;
    };

export async function getBestSellers(
  db: ShopDB,
  query: RankingQuery,
): Promise<RankingResult> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const rows = await db.query(
    query.timeWindow === "all"
      ? "SELECT data FROM shop_orders WHERE status='Đã giao'"
      : "SELECT data FROM shop_orders WHERE status='Đã giao' AND created_at >= $1",
    query.timeWindow === "all" ? [] : [since],
  );
  const sold = new Map<string, number>();
  for (const row of rows) {
    const items = (JSON.parse(String(row.data)).items || []) as Array<{
      id?: string;
      qty?: number;
    }>;
    for (const item of items)
      if (item.id)
        sold.set(item.id, (sold.get(item.id) || 0) + Number(item.qty || 0));
  }
  if (!sold.size) return { available: false, reason: "NO_VERIFIED_SALES_METRIC" };
  const products = (await listProducts(db))
    .filter(
      (product) =>
        sold.has(product.productId) &&
        (!query.categoryId || product.categoryId === query.categoryId) &&
        (!query.brandId ||
          product.brand.toLowerCase() === query.brandId.toLowerCase()),
    )
    .map((product) => ({ ...product, unitsSold: sold.get(product.productId)! }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, Math.max(1, Math.min(query.limit || 5, 5)));
  return products.length
    ? { available: true, source: "DELIVERED_ORDER_ITEM_QUANTITY", products }
    : { available: false, reason: "NO_VERIFIED_SALES_METRIC" };
}
