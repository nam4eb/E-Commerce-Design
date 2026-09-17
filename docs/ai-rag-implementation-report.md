# AI RAG implementation report

## Delivered

- Added portable, versioned knowledge-document and chunk tables with persisted embeddings and scope indexes.
- Added embedding-provider and vector-store abstractions, a deterministic test/development provider and optional Vercel AI Gateway embeddings.
- Added heading-aware parsing/chunking, checksums, unchanged-document skipping, transactional chunk replacement and seed ingestion from `shop_content`.
- Added hybrid cosine/keyword/metadata retrieval with product → brand → category → global fallback, active/public filtering and configurable relevance threshold.
- Added source routing so price, inventory, promotion and AC sizing retain their existing authoritative paths.
- Added compact verified context, source traces and RAG observability without logging document contents.
- Added authenticated admin CRUD/status/reindex APIs and `pnpm run ai:index-knowledge`.
- Added seven RAG evaluation records and a no-network regression suite.

## Database migration

The portable bootstrap creates `ai_knowledge_documents`, `ai_knowledge_chunks`, a document-scope index, a chunk document index and a unique document/chunk-index constraint. No destructive migration or external vector database is required.

## Provider and vector store

Default embedding provider: `local-hash-v1` (384 dimensions). Optional provider: Vercel AI Gateway `/v1/embeddings`. Vector store: current PostgreSQL/SQLite database through `DatabaseKnowledgeVectorStore`, with application-side cosine scoring. This V1 choice matches the current corpus size and dual-database architecture; pgvector is the recommended next adapter for a large corpus.

## Indexed data and types

Seed ingestion covers FAQ, policy, warranty and technical knowledge. The model accepts `FAQ`, `POLICY`, `WARRANTY`, `MANUAL`, `PRODUCT_KNOWLEDGE`, `TECHNICAL_DOCUMENT`, `INSTALLATION_GUIDE`, `USAGE_GUIDE` and `BRAND_DOCUMENTATION`.

## Validation

- RAG regression/unit suite: 12/12 passed.
- Existing commerce suite: 28/28 passed.
- Existing chatbot evaluation: 100% intent, 100% skill routing, 100% critical intents, 98.98% entity extraction, zero forbidden hallucination violations.
- TypeScript typecheck: passed for all workspaces.

## Current limits and recommendations

Application-side cosine scoring loads active chunks for each RAG query. Add a pgvector adapter and database-side nearest-neighbor query when the knowledge corpus becomes large. PDF/OCR ingestion is intentionally absent; convert authoritative PDFs to text/Markdown or add a parser adapter after validating document licensing and extraction quality. Admin APIs are complete, while a dedicated visual knowledge-management page can be added later.
