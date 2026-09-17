import { openCommerceDatabase } from "@workspace/db/commerce";
import { seedKnowledge } from "./ai/rag/seed";

const db = await openCommerceDatabase();
try {
  const results = await seedKnowledge(db);
  const summary = results.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({ indexed: results.length, summary }, null, 2));
} finally {
  await db.close();
}

