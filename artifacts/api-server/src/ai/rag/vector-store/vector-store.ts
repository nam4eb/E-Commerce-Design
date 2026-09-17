import type { ShopDB } from "../../../lib/shop-shared";
import type { KnowledgeChunk, KnowledgeDocument } from "../types";

export interface KnowledgeVectorStore {
  upsertDocument(document: KnowledgeDocument, chunks: KnowledgeChunk[]): Promise<void>;
  getDocument(id: string): Promise<KnowledgeDocument | undefined>;
  listDocuments(): Promise<KnowledgeDocument[]>;
  listActiveChunks(): Promise<Array<{ document: KnowledgeDocument; chunk: KnowledgeChunk }>>;
  deleteDocument(id: string): Promise<void>;
}

const json = <T>(value: unknown, fallback: T): T => {
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
};

function mapDocument(row: Record<string, unknown>): KnowledgeDocument {
  return {
    id: String(row.id), title: String(row.title), type: String(row.type) as KnowledgeDocument["type"],
    sourceType: String(row.source_type), sourceName: String(row.source_name), content: String(row.content),
    brandId: row.brand_id ? String(row.brand_id) : undefined,
    categoryId: row.category_id ? String(row.category_id) : undefined,
    productId: row.product_id ? String(row.product_id) : undefined,
    model: row.model ? String(row.model) : undefined,
    status: String(row.status) as KnowledgeDocument["status"], version: Number(row.version),
    checksum: String(row.checksum), metadata: json(row.metadata, {}),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapChunk(row: Record<string, unknown>): KnowledgeChunk {
  return {
    id: String(row.chunk_id || row.id), documentId: String(row.document_id), chunkIndex: Number(row.chunk_index),
    heading: String(row.heading || ""), content: String(row.chunk_content || row.content),
    tokenCount: Number(row.token_count), metadata: json(row.chunk_metadata || row.metadata, {}),
    embedding: json(row.embedding, []), createdAt: String(row.chunk_created_at || row.created_at),
    updatedAt: String(row.chunk_updated_at || row.updated_at),
  };
}

export class DatabaseKnowledgeVectorStore implements KnowledgeVectorStore {
  constructor(private readonly db: ShopDB) {}

  async getDocument(id: string) {
    const row = (await this.db.query("SELECT * FROM ai_knowledge_documents WHERE id=$1", [id]))[0];
    return row ? mapDocument(row) : undefined;
  }

  async listDocuments() {
    return (await this.db.query("SELECT * FROM ai_knowledge_documents ORDER BY updated_at DESC,id")).map(mapDocument);
  }

  async listActiveChunks() {
    const rows = await this.db.query(
      `SELECT d.*, c.id AS chunk_id, c.document_id, c.chunk_index, c.heading,
       c.content AS chunk_content, c.token_count, c.metadata AS chunk_metadata,
       c.embedding, c.created_at AS chunk_created_at, c.updated_at AS chunk_updated_at
       FROM ai_knowledge_chunks c JOIN ai_knowledge_documents d ON d.id=c.document_id
       WHERE d.status='active' ORDER BY d.updated_at DESC,d.id,c.chunk_index`,
    );
    return rows.map((row) => ({ document: mapDocument(row), chunk: mapChunk(row) }));
  }

  async upsertDocument(document: KnowledgeDocument, chunks: KnowledgeChunk[]) {
    await this.db.transaction(async (query) => {
      await query("DELETE FROM ai_knowledge_chunks WHERE document_id=$1", [document.id]);
      await query("DELETE FROM ai_knowledge_documents WHERE id=$1", [document.id]);
      await query(
        `INSERT INTO ai_knowledge_documents
         (id,title,type,source_type,source_name,brand_id,category_id,product_id,model,status,version,checksum,content,metadata,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [document.id, document.title, document.type, document.sourceType, document.sourceName,
          document.brandId || null, document.categoryId || null, document.productId || null,
          document.model || null, document.status, document.version, document.checksum,
          document.content, JSON.stringify(document.metadata), document.createdAt, document.updatedAt],
      );
      for (const chunk of chunks)
        await query(
          `INSERT INTO ai_knowledge_chunks
           (id,document_id,chunk_index,heading,content,token_count,metadata,embedding,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [chunk.id, chunk.documentId, chunk.chunkIndex, chunk.heading, chunk.content, chunk.tokenCount,
            JSON.stringify(chunk.metadata), JSON.stringify(chunk.embedding), chunk.createdAt, chunk.updatedAt],
        );
    });
  }

  async deleteDocument(id: string) {
    await this.db.query("DELETE FROM ai_knowledge_documents WHERE id=$1", [id]);
  }
}

