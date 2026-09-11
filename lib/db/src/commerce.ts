import pg from "pg";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type Row = Record<string, any>;
export type Query = (sql: string, values?: any[]) => Promise<Row[]>;
export async function openCommerceDatabase() {
  const url = process.env.DATABASE_URL;
  if (
    !url &&
    (!process.env.DATABASE_FILE || process.env.NODE_ENV === "production")
  ) {
    throw new Error(
      "Set DATABASE_URL (PostgreSQL), or DATABASE_FILE for local development.",
    );
  }
  const pool = url ? new pg.Pool({ connectionString: url }) : null;
  const file = process.env.DATABASE_FILE || ":memory:";
  if (!pool && file !== ":memory:")
    mkdirSync(dirname(resolve(file)), { recursive: true });
  const sqlite = pool ? null : new DatabaseSync(file);
  sqlite?.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const raw: Query = async (sql, values = []) => {
    if (pool) return (await pool.query(sql, values)).rows;
    const args: any[] = [];
    const statement = sqlite!.prepare(
      sql.replace(/\$(\d+)/g, (_, n) => {
        args.push(values[Number(n) - 1]);
        return "?";
      }),
    );
    return statement.all(...args) as Row[];
  };
  // Serialize SQLite work so no request can join another request's transaction.
  let tail = Promise.resolve();
  function exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = tail.then(work);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  const query: Query = (sql, args) =>
    pool ? raw(sql, args) : exclusive(() => raw(sql, args));
  async function transaction<T>(work: (q: Query) => Promise<T>): Promise<T> {
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work(
          async (sql, args) => (await client.query(sql, args)).rows,
        );
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    return exclusive(async () => {
      await raw("BEGIN IMMEDIATE");
      try {
        const result = await work(raw);
        await raw("COMMIT");
        return result;
      } catch (error) {
        await raw("ROLLBACK");
        throw error;
      }
    });
  }
  for (const sql of [
    `CREATE TABLE IF NOT EXISTS shop_products (id TEXT PRIMARY KEY, data TEXT NOT NULL, price INTEGER NOT NULL CHECK(price > 0), stock INTEGER NOT NULL CHECK(stock >= 0))`,
    `CREATE TABLE IF NOT EXISTS shop_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')), wishlist TEXT NOT NULL DEFAULT '[]')`,
    `CREATE TABLE IF NOT EXISTS shop_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES shop_users(id) ON DELETE CASCADE, expires BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shop_orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES shop_users(id), request_key TEXT NOT NULL, request_body TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id, request_key))`,
    `CREATE INDEX IF NOT EXISTS shop_orders_user ON shop_orders(user_id)`,
    `CREATE TABLE IF NOT EXISTS shop_identities (provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES shop_users(id), PRIMARY KEY(provider,subject), UNIQUE(provider,user_id))`,
    `CREATE TABLE IF NOT EXISTS shop_oauth_states (state TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, provider TEXT NOT NULL, verifier TEXT NOT NULL, user_id TEXT, expires BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shop_payments (order_id TEXT PRIMARY KEY REFERENCES shop_orders(id), provider TEXT NOT NULL, reference TEXT NOT NULL UNIQUE, amount BIGINT NOT NULL, state TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', transaction_id TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shop_content (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id))`,
    `CREATE TABLE IF NOT EXISTS shop_subscribers (email TEXT PRIMARY KEY, created_at TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS shop_reviews (product_id TEXT NOT NULL REFERENCES shop_products(id), user_id TEXT NOT NULL REFERENCES shop_users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(product_id,user_id))`,
    `CREATE TABLE IF NOT EXISTS shop_support (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES shop_users(id), subject TEXT NOT NULL, body TEXT NOT NULL, reply TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Mới', created_at TEXT NOT NULL)`,
  ])
    await query(sql);
  return {
    query,
    transaction,
    close: async () => {
      if (pool) await pool.end();
      else sqlite!.close();
    },
  };
}
