import { normalizeText } from "../normalization";
import type { EmbeddingProvider } from "./embeddings/embedding-provider";
import { ragConfig } from "./rag.config";
import type { KnowledgeSearchInput, KnowledgeSearchResult } from "./types";
import type { KnowledgeVectorStore } from "./vector-store/vector-store";

const cosine = (a: number[], b: number[]) => {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index]; aa += a[index] ** 2; bb += b[index] ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
};

const tokens = (value: string) => new Set(normalizeText(value).split(/\s+/).filter((term) => term.length > 1));
const keywordSimilarity = (query: string, content: string) => {
  const wanted = tokens(query); const available = tokens(content);
  if (!wanted.size) return 0;
  let matches = 0; for (const term of wanted) if (available.has(term)) matches++;
  return matches / wanted.size;
};

function applies(input: KnowledgeSearchInput, document: KnowledgeSearchResult["document"]) {
  const types = input.type ? (Array.isArray(input.type) ? input.type : [input.type]) : [];
  return (!types.length || types.includes(document.type)) &&
    (!input.productId || document.productId === input.productId) &&
    (!input.model || normalizeText(document.model || "") === normalizeText(input.model)) &&
    (!input.brandId || normalizeText(document.brandId || "") === normalizeText(input.brandId)) &&
    (!input.categoryId || document.categoryId === input.categoryId) &&
    document.metadata.access !== "internal";
}

export class KnowledgeRetriever {
  constructor(private readonly store: KnowledgeVectorStore, private readonly embeddings: EmbeddingProvider) {}

  async search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]> {
    const queryEmbedding = await this.embeddings.embedText(input.query);
    const candidates = (await this.store.listActiveChunks()).filter(({ document }) => applies(input, document));
    const results = candidates.map(({ document, chunk }) => {
      const vectorScore = Math.max(0, cosine(queryEmbedding, chunk.embedding));
      const keywordScore = keywordSimilarity(input.query, `${document.title} ${chunk.heading} ${chunk.content} ${document.model || ""}`);
      let metadataScore = 0;
      const requestedTypes = input.type ? (Array.isArray(input.type) ? input.type : [input.type]) : [];
      if (requestedTypes.includes(document.type)) metadataScore += 0.6;
      if (input.productId && document.productId === input.productId) metadataScore += 1;
      if (input.model && normalizeText(document.model || "") === normalizeText(input.model)) metadataScore += 1;
      if (input.brandId && normalizeText(document.brandId || "") === normalizeText(input.brandId)) metadataScore += 0.7;
      if (input.categoryId && document.categoryId === input.categoryId) metadataScore += 0.4;
      if (document.metadata.official) metadataScore += 0.25;
      const recency = Math.min(0.1, Math.max(0, document.version - 1) * 0.02);
      const score = Math.min(1, vectorScore * 0.45 + keywordScore * 0.35 + Math.min(1, metadataScore) * 0.2 + recency);
      const scope = document.productId || document.model ? "product" : document.brandId ? "brand" : document.categoryId ? "category" : "global";
      return { document, chunk, score, vectorScore, keywordScore, metadataScore, scope } as KnowledgeSearchResult;
    });
    return results
      .filter((result) => result.score >= ragConfig().minScore)
      .sort((a, b) => b.score - a.score || b.document.version - a.document.version || b.document.updatedAt.localeCompare(a.document.updatedAt))
      .slice(0, input.limit || ragConfig().topK);
  }

  async searchWithFallback(input: KnowledgeSearchInput) {
    const levels: KnowledgeSearchInput[] = [];
    if (input.productId || input.model) levels.push({ ...input });
    if (input.brandId) levels.push({ ...input, productId: undefined, model: undefined });
    if (input.categoryId) levels.push({ ...input, productId: undefined, model: undefined, brandId: undefined });
    levels.push({ ...input, productId: undefined, model: undefined, brandId: undefined, categoryId: undefined });
    const seen = new Set<string>();
    for (const level of levels) {
      const key = JSON.stringify(level);
      if (seen.has(key)) continue;
      seen.add(key);
      let results = await this.search(level);
      const fellBackFromSpecific = Boolean(input.productId || input.model) && !level.productId && !level.model;
      if (fellBackFromSpecific)
        results = results.filter((result) =>
          (!result.document.model || normalizeText(result.document.model) === normalizeText(input.model || "")) &&
          result.keywordScore >= 0.55,
        );
      if (results.length) return results;
    }
    return [];
  }
}

export const retrievalMath = { cosine, keywordSimilarity };
