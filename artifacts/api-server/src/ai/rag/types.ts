export const knowledgeTypes = [
  "FAQ",
  "POLICY",
  "WARRANTY",
  "MANUAL",
  "PRODUCT_KNOWLEDGE",
  "TECHNICAL_DOCUMENT",
  "INSTALLATION_GUIDE",
  "USAGE_GUIDE",
  "BRAND_DOCUMENTATION",
] as const;

export type KnowledgeType = (typeof knowledgeTypes)[number];
export type KnowledgeStatus = "active" | "disabled" | "obsolete";

export interface KnowledgeMetadata {
  language?: string;
  official?: boolean;
  access?: "public" | "internal";
  model?: string;
  source?: string;
  heading?: string;
  [key: string]: unknown;
}

export interface KnowledgeDocumentInput {
  id?: string;
  title: string;
  type: KnowledgeType;
  sourceType: string;
  sourceName: string;
  content: string;
  brandId?: string;
  categoryId?: string;
  productId?: string;
  model?: string;
  status?: KnowledgeStatus;
  version?: number;
  metadata?: KnowledgeMetadata;
}

export interface KnowledgeDocument extends Required<Pick<KnowledgeDocumentInput,
  "title" | "type" | "sourceType" | "sourceName" | "content">> {
  id: string;
  brandId?: string;
  categoryId?: string;
  productId?: string;
  model?: string;
  status: KnowledgeStatus;
  version: number;
  checksum: string;
  metadata: KnowledgeMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  heading: string;
  content: string;
  tokenCount: number;
  metadata: KnowledgeMetadata;
  embedding: number[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSearchInput {
  query: string;
  type?: KnowledgeType | KnowledgeType[];
  brandId?: string;
  categoryId?: string;
  productId?: string;
  model?: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  document: KnowledgeDocument;
  score: number;
  vectorScore: number;
  keywordScore: number;
  metadataScore: number;
  scope: "product" | "brand" | "category" | "global";
}

export interface KnowledgeSourceTrace {
  documentId: string;
  title: string;
  type: KnowledgeType;
  sourceName: string;
  version: number;
  score: number;
}

