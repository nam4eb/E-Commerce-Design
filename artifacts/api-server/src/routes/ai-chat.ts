import { randomUUID } from "node:crypto";
import type { Router } from "express";
import { answerChat } from "../ai/chat-engine";
import type { AIChatResponse, ChatContext, ChatIntent } from "../ai/types";
import { chatIntentSet } from "../ai/taxonomy";
import { check, HttpError, type Guards, type ShopDB } from "../lib/shop-shared";

const limits = new Map<string, { count: number; reset: number }>();
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function aiConfig() {
  return {
    enabled: true,
    providerEnabled: Boolean(
      process.env.AI_GATEWAY_API_KEY && process.env.AI_MODEL,
    ),
    model: process.env.AI_MODEL || "",
    syncEnabled: process.env.AI_CHAT_SYNC_ENABLED !== "false",
  };
}

function rateLimit(ip: string) {
  const now = Date.now();
  for (const [key, value] of limits) if (value.reset < now) limits.delete(key);
  const current = limits.get(ip);
  const value =
    !current || current.reset < now
      ? { count: 0, reset: now + 10 * 60_000 }
      : current;
  value.count++;
  limits.set(ip, value);
  if (value.count > 15)
    throw new HttpError(
      429,
      "Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.",
    );
}

function parseContext(value: unknown): ChatContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  return {
    lastProductId:
      typeof input.lastProductId === "string" &&
      input.lastProductId.length <= 100
        ? input.lastProductId
        : undefined,
    lastCategoryId:
      typeof input.lastCategoryId === "string" &&
      input.lastCategoryId.length <= 100
        ? input.lastCategoryId
        : undefined,
    lastIntent:
      typeof input.lastIntent === "string" &&
      chatIntentSet.has(input.lastIntent)
        ? (input.lastIntent as ChatIntent)
        : undefined,
    constraints:
      input.constraints && typeof input.constraints === "object"
        ? input.constraints
        : undefined,
  };
}

async function ensureConversation(
  db: ShopDB,
  id: string,
  userId: string,
  title: string,
) {
  const owner = (
    await db.query("SELECT user_id FROM shop_ai_chats WHERE id=$1", [id])
  )[0];
  if (owner && owner.user_id !== userId)
    throw new HttpError(403, "Cuộc trò chuyện không thuộc tài khoản này");
  if (!owner) {
    const now = new Date().toISOString();
    await db.query(
      "INSERT INTO shop_ai_chats (id,user_id,title,created_at,updated_at) VALUES ($1,$2,$3,$4,$4)",
      [id, userId, title.slice(0, 80), now],
    );
  }
}

async function persistExchange(
  db: ShopDB,
  userId: string,
  chatId: string,
  question: string,
  answer: AIChatResponse,
  startedAt: number,
  model?: string,
  inputTokens?: number,
  outputTokens?: number,
) {
  await ensureConversation(db, chatId, userId, question);
  const askedAt = new Date().toISOString();
  const answeredAt = new Date(Date.now() + 1).toISOString();
  await db.transaction(async (q) => {
    await q(
      "INSERT INTO shop_ai_messages (id,chat_id,role,content,intent,product_id,model,input_tokens,output_tokens,latency_ms,response_type,created_at) VALUES ($1,$2,'user',$3,$4,$5,NULL,NULL,NULL,NULL,'question',$6)",
      [
        randomUUID(),
        chatId,
        question,
        answer.intent,
        answer.context.lastProductId || null,
        askedAt,
      ],
    );
    await q(
      "INSERT INTO shop_ai_messages (id,chat_id,role,content,intent,product_id,model,input_tokens,output_tokens,latency_ms,response_type,created_at) VALUES ($1,$2,'assistant',$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        randomUUID(),
        chatId,
        answer.message,
        answer.intent,
        answer.context.lastProductId || null,
        model || null,
        inputTokens || null,
        outputTokens || null,
        Date.now() - startedAt,
        answer.responseType,
        answeredAt,
      ],
    );
    await q(
      "UPDATE shop_ai_chats SET updated_at=$1 WHERE id=$2 AND user_id=$3",
      [answeredAt, chatId, userId],
    );
  });
}

export function registerAiChat(router: Router, db: ShopDB, { auth }: Guards) {
  router.get("/ai/chats", auth, async (_req, res) => {
    res.json(
      await db.query(
        "SELECT id,title,created_at,updated_at FROM shop_ai_chats WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 30",
        [res.locals.user.id],
      ),
    );
  });
  router.get("/ai/chats/:id", auth, async (req, res) => {
    const chat = (
      await db.query(
        "SELECT id,title FROM shop_ai_chats WHERE id=$1 AND user_id=$2",
        [req.params.id, res.locals.user.id],
      )
    )[0];
    if (!chat) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện");
    res.json({
      ...chat,
      messages: await db.query(
        "SELECT role,content,intent,product_id,response_type,created_at FROM shop_ai_messages WHERE chat_id=$1 ORDER BY created_at,id",
        [chat.id],
      ),
    });
  });
  router.delete("/ai/chats/:id", auth, async (req, res) => {
    const rows = await db.query(
      "DELETE FROM shop_ai_chats WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, res.locals.user.id],
    );
    if (!rows.length)
      throw new HttpError(404, "Không tìm thấy cuộc trò chuyện");
    res.json({ ok: true });
  });
  router.post("/ai/chat", async (req, res) => {
    const startedAt = Date.now();
    rateLimit(req.ip || "unknown");
    const message =
      typeof req.body.message === "string" ? req.body.message.trim() : "";
    check(
      message.length >= 1 && message.length <= 2000,
      "Tin nhắn phải có từ 1 đến 2.000 ký tự",
    );
    const context = parseContext(req.body.context);
    const chatId =
      typeof req.body.conversationId === "string"
        ? req.body.conversationId
        : randomUUID();
    check(uuid.test(chatId), "Mã hội thoại không hợp lệ");
    const result = await answerChat(db, message, context);
    if (res.locals.user)
      await persistExchange(
        db,
        res.locals.user.id,
        chatId,
        message,
        result.response,
        startedAt,
        result.generation?.model,
        result.generation?.inputTokens,
        result.generation?.outputTokens,
      );
    const response = { ...result.response, conversationId: chatId };
    (req as typeof req & { log?: { info(data: object): void } }).log?.info({
      event: "ai_chat_completed",
      requestId: req.id,
      intent: response.intent,
      latencyMs: Date.now() - startedAt,
      model: result.generation?.model,
      responseType: response.responseType,
      productCount: response.products?.length || 0,
      authenticated: Boolean(res.locals.user),
    });
    res.json(response);
  });
  router.post("/ai/conversations/sync", auth, async (req, res) => {
    check(aiConfig().syncEnabled, "Đồng bộ hội thoại đang tắt");
    const conversationId =
      typeof req.body.conversationId === "string"
        ? req.body.conversationId
        : randomUUID();
    check(uuid.test(conversationId), "Mã hội thoại không hợp lệ");
    check(Array.isArray(req.body.messages), "Danh sách tin nhắn không hợp lệ");
    const messages = req.body.messages.slice(-20).map((item: unknown) => {
      const value = item as Record<string, unknown>;
      return {
        role: value.role,
        content: typeof value.content === "string" ? value.content.trim() : "",
      };
    });
    check(
      messages.length > 0 &&
        messages.every(
          (item: { role: unknown; content: string }) =>
            ["user", "assistant"].includes(String(item.role)) &&
            item.content.length > 0 &&
            item.content.length <= 12_000,
        ) &&
        messages.reduce(
          (sum: number, item: { content: string }) => sum + item.content.length,
          0,
        ) <= 40_000,
      "Nội dung đồng bộ không hợp lệ",
    );
    await ensureConversation(
      db,
      conversationId,
      res.locals.user.id,
      messages.find((item: { role: unknown }) => item.role === "user")
        ?.content || "Hội thoại đã đồng bộ",
    );
    const existing = Number(
      (
        await db.query(
          "SELECT COUNT(*) AS count FROM shop_ai_messages WHERE chat_id=$1",
          [conversationId],
        )
      )[0]?.count || 0,
    );
    if (!existing) {
      const base = Date.now() - messages.length;
      await db.transaction(async (q) => {
        for (const [index, item] of messages.entries())
          await q(
            "INSERT INTO shop_ai_messages (id,chat_id,role,content,response_type,created_at) VALUES ($1,$2,$3,$4,'synced',$5)",
            [
              randomUUID(),
              conversationId,
              item.role,
              item.content,
              new Date(base + index).toISOString(),
            ],
          );
      });
    }
    res.json({ id: conversationId, imported: existing ? 0 : messages.length });
  });
}
