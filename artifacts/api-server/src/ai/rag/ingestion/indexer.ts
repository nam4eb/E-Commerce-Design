import { createHash, randomUUID } from "node:crypto";
import type { EmbeddingProvider } from "../embeddings/embedding-provider";
import { normalizeDocumentContent, chunkDocument } from "./chunker";
import type { KnowledgeDocument, KnowledgeDocumentInput } from "../types";
import type { KnowledgeVectorStore } from "../vector-store/vector-store";

export class KnowledgeIndexer {
  constructor(
    private readonly store: KnowledgeVectorStore,
    private readonly embeddings: EmbeddingProvider,
  ) {}

  async indexDocument(input: KnowledgeDocumentInput) {
    const content = normalizeDocumentContent(input.content);
    if (!content) throw new Error("Knowledge document content is empty");
    const id = input.id || randomUUID();
    const checksum = createHash("sha256").update(JSON.stringify({ ...input, id: undefined, content })).digest("hex");
    const existing = await this.store.getDocument(id);
    if (existing?.checksum === checksum) return { id, status: "skipped" as const, chunks: 0 };
    const parsed = chunkDocument(content, {
      ...input.metadata,
      language: input.metadata?.language || "vi",
      model: input.model || input.metadata?.model,
    });
    const vectors = await this.embeddings.embedTexts(parsed.map((chunk) => chunk.content));
    const now = new Date().toISOString();
    const document: KnowledgeDocument = {
      id, title: input.title, type: input.type, sourceType: input.sourceType,
      sourceName: input.sourceName, content, brandId: input.brandId, categoryId: input.categoryId,
      productId: input.productId, model: input.model, status: input.status || "active",
      version: input.version || (existing?.version ? existing.version + 1 : 1), checksum,
      metadata: { language: "vi", access: "public", ...input.metadata },
      createdAt: existing?.createdAt || now, updatedAt: now,
    };
    await this.store.upsertDocument(document, parsed.map((chunk, index) => ({
      id: `${id}:${index}`, documentId: id, chunkIndex: index, ...chunk,
      embedding: vectors[index], createdAt: now, updatedAt: now,
    })));
    return { id, status: existing ? "updated" as const : "created" as const, chunks: parsed.length };
  }

  async disableDocument(id: string) {
    const existing = await this.store.getDocument(id);
    if (!existing) return false;
    await this.indexDocument({ ...existing, status: "disabled", version: existing.version + 1 });
    return true;
  }
}

