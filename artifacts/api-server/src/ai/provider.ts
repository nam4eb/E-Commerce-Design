import { HttpError } from "../lib/shop-shared";
import { chatIntents, chatIntentSet, intentSkill } from "./taxonomy";
import type { ChatContext, IntentResult } from "./types";

const endpoint = "https://ai-gateway.vercel.sh/v1/chat/completions";

export interface GenerationResult {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export async function generateGroundedAnswer(
  question: string,
  verifiedContext: string,
): Promise<GenerationResult> {
  const model = process.env.AI_MODEL || "";
  if (!process.env.AI_GATEWAY_API_KEY || !model)
    throw new HttpError(503, "AI provider chưa được cấu hình.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý sản phẩm. Chỉ dùng thông tin đã xác minh do backend cung cấp. Không bịa giá, tồn kho, khuyến mãi, SKU hoặc thông số. Trả lời tiếng Việt, ngắn gọn. Nếu thiếu dữ liệu, nói chưa thể xác nhận.",
        },
        {
          role: "user",
          content: `Thông tin đã xác minh:\n${verifiedContext}\n\nCâu hỏi: ${question}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new HttpError(503, "AI provider tạm thời không khả dụng.");
  const body = (await response.json()) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new HttpError(502, "AI provider không trả về nội dung.");
  return {
    text,
    model: body.model || model,
    inputTokens: body.usage?.prompt_tokens,
    outputTokens: body.usage?.completion_tokens,
  };
}

export async function classifyCommerceIntent(
  question: string,
  context: ChatContext,
): Promise<IntentResult> {
  const model = process.env.AI_MODEL || "";
  if (!process.env.AI_GATEWAY_API_KEY || !model)
    throw new HttpError(503, "AI provider chưa được cấu hình.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Classify Vietnamese electronics-commerce requests. Return JSON only: {"intent":"...","confidence":0..1,"entities":{}}. Allowed intents: ${chatIntents.join(", ")}. Extract constraints only from the question or supplied short context. Never answer the question and never invent product facts.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            context: {
              lastIntent: context.lastIntent,
              lastCategoryId: context.lastCategoryId,
              constraints: context.constraints,
            },
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(12_000),
    redirect: "error",
  });
  if (!response.ok) throw new HttpError(503, "AI classifier tạm thời không khả dụng.");
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const parsed = JSON.parse(body.choices?.[0]?.message?.content || "{}") as {
    intent?: string;
    confidence?: number;
    entities?: Record<string, unknown>;
  };
  if (!parsed.intent || !chatIntentSet.has(parsed.intent))
    throw new HttpError(502, "AI classifier trả về intent không hợp lệ.");
  return {
    intent: parsed.intent as IntentResult["intent"],
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    entities: parsed.entities || {},
    skill: intentSkill[parsed.intent as IntentResult["intent"]],
  };
}
