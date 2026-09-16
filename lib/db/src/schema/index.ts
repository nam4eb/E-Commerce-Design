import {
  pgTable,
  text,
  integer,
  bigint,
  uniqueIndex,
  index,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Keep aligned with the portable bootstrap in ../commerce.ts.
export const shopProducts = pgTable(
  "shop_products",
  {
    id: text("id").primaryKey(),
    data: text("data").notNull(),
    price: integer("price").notNull(),
    stock: integer("stock").notNull(),
  },
  (t) => [
    check("shop_products_price_check", sql`${t.price} > 0`),
    check("shop_products_stock_check", sql`${t.stock} >= 0`),
  ],
);
export const shopProductDrafts = pgTable(
  "shop_product_drafts",
  {
    id: text("id").primaryKey(),
    data: text("data").notNull(),
    sourceSheet: text("source_sheet").notNull(),
    importBatch: text("import_batch").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("shop_product_drafts_batch").on(t.importBatch, t.createdAt)],
);
export const shopUsers = pgTable(
  "shop_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    role: text("role").notNull().default("customer"),
    wishlist: text("wishlist").notNull().default("[]"),
  },
  (t) => [
    check("shop_users_role_check", sql`${t.role} IN ('customer', 'admin')`),
  ],
);
export const shopSessions = pgTable("shop_sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => shopUsers.id, { onDelete: "cascade" }),
  expires: bigint("expires", { mode: "number" }).notNull(),
});
export const shopOrders = pgTable(
  "shop_orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => shopUsers.id),
    requestKey: text("request_key").notNull(),
    requestBody: text("request_body").notNull(),
    data: text("data").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("shop_orders_user_request").on(t.userId, t.requestKey),
    index("shop_orders_user").on(t.userId),
  ],
);
export const shopIdentities = pgTable(
  "shop_identities",
  {
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => shopUsers.id),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.subject] }),
    uniqueIndex("shop_identities_provider_user").on(t.provider, t.userId),
  ],
);
export const shopOAuthStates = pgTable("shop_oauth_states", {
  state: text("state").primaryKey(),
  browserHash: text("browser_hash").notNull(),
  provider: text("provider").notNull(),
  verifier: text("verifier").notNull(),
  userId: text("user_id"),
  expires: bigint("expires", { mode: "number" }).notNull(),
});
export const shopPayments = pgTable("shop_payments", {
  orderId: text("order_id")
    .primaryKey()
    .references(() => shopOrders.id),
  provider: text("provider").notNull(),
  reference: text("reference").notNull().unique(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  state: text("state").notNull(),
  url: text("url").notNull().default(""),
  transactionId: text("transaction_id").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
});
export const shopContent = pgTable(
  "shop_content",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    data: text("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);
export const shopSubscribers = pgTable("shop_subscribers", {
  email: text("email").primaryKey(),
  createdAt: text("created_at").notNull(),
  active: integer("active").notNull().default(1),
});
export const shopReviews = pgTable(
  "shop_reviews",
  {
    productId: text("product_id")
      .notNull()
      .references(() => shopProducts.id),
    userId: text("user_id")
      .notNull()
      .references(() => shopUsers.id),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.userId] }),
    check("shop_reviews_rating_check", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);
export const shopSupport = pgTable("shop_support", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => shopUsers.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  reply: text("reply").notNull().default(""),
  status: text("status").notNull().default("Mới"),
  createdAt: text("created_at").notNull(),
});
export const shopAiChats = pgTable(
  "shop_ai_chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => shopUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("shop_ai_chats_user").on(t.userId, t.updatedAt)],
);
export const shopAiMessages = pgTable(
  "shop_ai_messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => shopAiChats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    intent: text("intent"),
    productId: text("product_id"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    responseType: text("response_type"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("shop_ai_messages_chat").on(t.chatId, t.createdAt),
    check(
      "shop_ai_messages_role_check",
      sql`${t.role} IN ('user','assistant')`,
    ),
  ],
);
