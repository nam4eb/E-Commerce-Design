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
  pendingSkill?: string;
  requirements?: Partial<ConsultationRequirements>;
  missingFields?: string[];
  candidateProductIds?: string[];
}

export interface ConsultationRequirements {
  category?: string;
  areaM2?: number;
  dimensions?: { width?: number; length?: number; height?: number };
  roomType?: "BEDROOM" | "LIVING_ROOM" | "OFFICE" | "KITCHEN" | "OTHER";
  direction?: "EAST" | "WEST" | "SOUTH" | "NORTH";
  topFloor?: boolean;
  connectedKitchen?: boolean;
  openSpace?: boolean;
  largeGlassArea?: boolean;
  ceilingHeightM?: number;
  people?: number;
  heatSources?: string[];
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  capacityBTU?: number;
  inverter?: boolean;
  priorities?: string[];
  requiredFeatures?: string[];
  excludedFeatures?: string[];
  excludedBrands?: string[];
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
  roomType?: ConsultationRequirements["roomType"];
  capacityBTU?: number;
  horsepower?: number;
  inverter?: boolean;
  people?: number;
  direction?: ConsultationRequirements["direction"];
  topFloor?: boolean;
  connectedKitchen?: boolean;
  openSpace?: boolean;
  largeGlassArea?: boolean;
  heatSources?: string[];
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
  technicalMatch?: "EXACT_MATCH" | "ALTERNATIVE_HIGHER_CAPACITY" | "ALTERNATIVE_LOWER_CAPACITY" | "OUTSIDE_RECOMMENDATION";
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
    recommendedRangeBTU: { min: number; max: number };
    primaryCommercialBTU: number;
    alternativeCommercialBTU?: number;
    recommendedHP: number;
    heatLoad: "LOW" | "NORMAL" | "ELEVATED" | "HIGH";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    assumptions: string[];
    heatLoadFactors: string[];
    missingImportantFactors: string[];
  };
  conversationId?: string;
  source?: AnswerSource;
  sources?: KnowledgeSourceTrace[];
}
