import type { ShopDB } from "../../lib/shop-shared";
import type { ChatContext, ExtractedEntities } from "../types";
import type { ChatIntent } from "../taxonomy";
import { createEmbeddingProvider, type EmbeddingProvider } from "./embeddings/embedding-provider";
import { buildRAGContext } from "./context-builder";
import { KnowledgeIndexer } from "./ingestion/indexer";
import { ragConfig } from "./rag.config";
import { KnowledgeRetriever } from "./retriever";
import { knowledgeTypesForIntent } from "./source-router";
import type { KnowledgeDocumentInput } from "./types";
import { DatabaseKnowledgeVectorStore } from "./vector-store/vector-store";

export function createRAGServices(db: ShopDB, embeddings: EmbeddingProvider = createEmbeddingProvider()) {
  const store = new DatabaseKnowledgeVectorStore(db);
  return { store, indexer: new KnowledgeIndexer(store, embeddings), retriever: new KnowledgeRetriever(store, embeddings), embeddings };
}

export async function retrieveRAGKnowledge(
  db: ShopDB,
  question: string,
  intent: ChatIntent,
  entities: ExtractedEntities,
  context: ChatContext,
) {
  const startedAt = Date.now();
  const services = createRAGServices(db);
  const results = await services.retriever.searchWithFallback({
    query: question,
    type: knowledgeTypesForIntent(intent),
    productId: entities.model ? undefined : context.lastProductId,
    model: entities.model || context.constraints?.model,
    brandId: entities.brand || context.constraints?.brand,
    categoryId: entities.category || context.lastCategoryId,
    limit: ragConfig().topK,
  });
  const built = buildRAGContext(results);
  return {
    ...built,
    trace: {
      ragUsed: true,
      retrievalLatencyMs: Date.now() - startedAt,
      retrievedChunkCount: results.length,
      topScore: results[0]?.score || 0,
      documentIds: [...new Set(results.map((item) => item.document.id))],
      embeddingModel: services.embeddings.model,
    },
  };
}

export async function indexKnowledgeDocuments(db: ShopDB, documents: KnowledgeDocumentInput[]) {
  const { indexer } = createRAGServices(db);
  const results = [];
  for (const document of documents) results.push(await indexer.indexDocument(document));
  return results;
}
