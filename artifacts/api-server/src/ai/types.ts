import type { ChatIntent } from "./taxonomy";
import type { AnswerSource } from "./rag/source-router";
import type { KnowledgeSourceTrace } from "./rag/types";
export type { ChatIntent } from "./taxonomy";

export interface IntentResult {
  intent: ChatIntent;
  confidence: number;
  entities: Record<string, unknown>;
  skill?: string;
}

export interface ChatContext {
  lastProductId?: string;
  lastCategoryId?: string;
  lastIntent?: ChatIntent;
  constraints?: Partial<ExtractedEntities>;
}

export interface ExtractedEntities {
  productName?: string;
  model?: string;
  sku?: string;
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  area?: number;
  areaM2?: number;
  dimensions?: { width?: number; length?: number; height?: number };
  ceilingHeight?: number;
  roomType?: string;
  capacityBTU?: number;
  horsepower?: number;
  inverter?: boolean;
  people?: number;
  direction?: string;
  topFloor?: boolean;
  largeGlassArea?: boolean;
  heatSources?: boolean;
  viewingDistanceM?: number;
  requiredFeatures?: string[];
  excludedFeatures?: string[];
  excludedBrands?: string[];
  quantity?: number;
  timeWindow?: string;
  inStock?: boolean;
  keywords?: string[];
}

export interface ChatProduct {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  stock: number;
  brand: string;
  capacityBTU?: number;
}

export type ChatResponseType =
  | "direct"
  | "advice"
  | "products"
  | "clarification"
  | "generated"
  | "limitation"
  | "handoff";

export interface AIChatResponse {
  message: string;
  intent: ChatIntent;
  responseType: ChatResponseType;
  context: ChatContext;
  products?: ChatProduct[];
  recommendation?: {
    type: "AIR_CONDITIONER";
    estimatedBTU: number;
    recommendedBTU: number;
    recommendedHP: number;
    heatLoad: "LOW" | "NORMAL" | "HIGH";
    missingImportantFactors: string[];
  };
  conversationId?: string;
  source?: AnswerSource;
  sources?: KnowledgeSourceTrace[];
}
