import type { ChatIntent } from "../taxonomy";
import type { KnowledgeType } from "./types";

export type AnswerSource = "PRODUCT_DB" | "INVENTORY" | "PROMOTION_DB" | "SKILL" | "RAG" | "GENERAL";

const ragTypes: Partial<Record<ChatIntent, KnowledgeType[]>> = {
  WARRANTY: ["WARRANTY", "MANUAL", "BRAND_DOCUMENTATION"],
  RETURN_EXCHANGE: ["POLICY", "FAQ"],
  SHIPPING: ["POLICY", "FAQ"],
  INSTALLATION: ["INSTALLATION_GUIDE", "POLICY", "MANUAL"],
  PRODUCT_TECH_EXPLAIN: ["TECHNICAL_DOCUMENT", "PRODUCT_KNOWLEDGE", "BRAND_DOCUMENTATION"],
  PRODUCT_USAGE_GUIDANCE: ["USAGE_GUIDE", "MANUAL", "PRODUCT_KNOWLEDGE"],
  COMPATIBILITY: ["MANUAL", "TECHNICAL_DOCUMENT", "PRODUCT_KNOWLEDGE"],
};

export function resolveAnswerSource(intent: ChatIntent): AnswerSource {
  if (intent === "PRODUCT_PRICE") return "PRODUCT_DB";
  if (["PRODUCT_STOCK", "VARIANT_AVAILABILITY"].includes(intent)) return "INVENTORY";
  if (intent === "PRODUCT_PROMOTION") return "PROMOTION_DB";
  if (intent === "AIR_CONDITIONER_SIZING" || intent === "AIR_CONDITIONER_HEAT_LOAD") return "SKILL";
  if (ragTypes[intent]) return "RAG";
  return "GENERAL";
}

export function knowledgeTypesForIntent(intent: ChatIntent) {
  return ragTypes[intent];
}

