import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { openCommerceDatabase } from "@workspace/db/commerce";
import {
  commitProductRows,
  parseProductWorkbook,
} from "./routes/product-import";

const path = process.argv[2];
if (!path) throw new Error("Usage: node import-products.mjs <workbook.xlsx>");
const db = await openCommerceDatabase();
try {
  const rows = await parseProductWorkbook(await readFile(path), db);
  const result = await commitProductRows(db, rows, randomUUID());
  console.log(JSON.stringify({ total: rows.length, ...result }));
} finally {
  await db.close();
}
