import type { ShopDB } from "../lib/shop-shared";
import { compact, normalizeText, parseBTU } from "./normalization";
import type { ChatProduct, ExtractedEntities } from "./types";

export interface StoreProduct extends ChatProduct {
  categoryId: string;
  category: string;
  specs: { label: string; value: string }[];
  tags: string[];
}

function toProduct(row: Record<string, unknown>): StoreProduct {
  const data = JSON.parse(String(row.data)) as Record<string, unknown>;
  const specs = Array.isArray(data.specs)
    ? (data.specs as { label: string; value: string }[])
    : [];
  const capacity = specs.find((item) =>
    normalizeText(item.label).includes("cong suat"),
  );
  return {
    productId: String(row.id),
    slug: String(row.id),
    name: String(data.name || row.id),
    brand: String(data.brand || ""),
    categoryId: String(data.categoryId || ""),
    category: String(data.category || data.categoryId || ""),
    price: Number(row.price),
    originalPrice: Number(data.oldPrice || row.price),
    stock: Number(row.stock),
    image: String(data.image || ""),
    specs,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    capacityBTU: capacity ? parseBTU(capacity.value) : undefined,
  };
}

export async function listProducts(db: ShopDB) {
  return (await db.query("SELECT id,data,price,stock FROM shop_products")).map(
    toProduct,
  );
}

export async function getProduct(db: ShopDB, id: string) {
  const row = (
    await db.query(
      "SELECT id,data,price,stock FROM shop_products WHERE id=$1",
      [id],
    )
  )[0];
  return row ? toProduct(row) : undefined;
}

export async function resolveProduct(
  db: ShopDB,
  message: string,
  entities: ExtractedEntities,
  contextProductId?: string,
) {
  if (contextProductId) {
    const contextual = await getProduct(db, contextProductId);
    if (contextual) return contextual;
  }
  const query = compact(entities.model || entities.sku || message);
  const words = normalizeText(message)
    .split(" ")
    .filter((word) => word.length >= 3);
  const scored = (await listProducts(db))
    .map((product) => {
      const searchable = compact(
        [
          product.productId,
          product.name,
          product.brand,
          product.category,
          ...product.tags,
          ...product.specs.flatMap((item) => [item.label, item.value]),
        ].join(" "),
      );
      const exactModel = Boolean(entities.model && searchable.includes(query));
      const score =
        (exactModel ? 100 : 0) +
        words.filter((word) => searchable.includes(compact(word))).length * 3 +
        (entities.brand && product.brand === entities.brand ? 10 : 0) +
        (entities.category && product.categoryId === entities.category ? 8 : 0);
      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return undefined;
  if (entities.model && scored[0].score < 100) return undefined;
  return scored[0].product;
}

export async function searchProducts(
  db: ShopDB,
  entities: ExtractedEntities,
  limit = 4,
) {
  const keywords = entities.keywords || [];
  return (await listProducts(db))
    .filter(
      (product) =>
        (!entities.category || product.categoryId === entities.category) &&
        (!entities.brand || product.brand === entities.brand) &&
        (!entities.minPrice || product.price >= entities.minPrice) &&
        (!entities.maxPrice || product.price <= entities.maxPrice) &&
        (!entities.capacityBTU ||
          Math.abs((product.capacityBTU || 0) - entities.capacityBTU) <= 500) &&
        (!entities.inStock || product.stock > 0) &&
        (!entities.excludedBrands?.some(
          (brand) => brand.toLowerCase() === product.brand.toLowerCase(),
        )) &&
        (!entities.requiredFeatures?.length ||
          entities.requiredFeatures.every((feature) =>
            normalizeText(
              `${product.name} ${product.tags.join(" ")} ${product.specs
                .map((spec) => `${spec.label} ${spec.value}`)
                .join(" ")}`,
            ).includes(normalizeText(feature)),
          )) &&
        (!entities.excludedFeatures?.length ||
          entities.excludedFeatures.every(
            (feature) =>
              !normalizeText(
                `${product.name} ${product.tags.join(" ")} ${product.specs
                  .map((spec) => `${spec.label} ${spec.value}`)
                  .join(" ")}`,
              ).includes(normalizeText(feature)),
          )) &&
        (entities.inverter === undefined ||
          product.tags.some((tag) => normalizeText(tag).includes("inverter")) ||
          product.specs.some((spec) =>
            normalizeText(spec.value).includes("inverter"),
          )),
    )
    .map((product) => ({
      product,
      score:
        (product.stock > 0 ? 20 : 0) +
        keywords.filter((word) =>
          normalizeText(
            `${product.name} ${product.brand} ${product.tags.join(" ")}`,
          ).includes(word),
        ).length,
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, Math.max(1, Math.min(limit, 5)))
    .map((item) => item.product);
}
