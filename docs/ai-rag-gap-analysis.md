# AI RAG gap analysis

## Current architecture

The application uses an Express/TypeScript API, a React storefront, a deterministic intent/entity layer, a skill registry, direct commerce database queries, and Vercel AI Gateway for low-confidence classification and grounded answer wording. The same portable database wrapper supports PostgreSQL in Docker and SQLite during local development.

## Reusable modules

- `POST /api/ai/chat`, short `ChatContext`, authentication and conversation persistence remain unchanged.
- The existing intent taxonomy already contains warranty, returns, shipping, installation, technical explanation and usage guidance intents.
- Product resolution and dynamic price/stock retrieval remain the source of truth.
- `generateGroundedAnswer` already enforces a verified-context prompt.
- Existing admin guards and `shop_content` provide safe ingestion points.

## Gaps

- Existing policy lookup is substring matching over `shop_content`; there are no versioned documents, chunks, embeddings, metadata filters, citations or score thresholds.
- PostgreSQL currently uses the standard `postgres:17-alpine` image and has no pgvector extension. The application also promises SQLite portability.
- There is no document ingestion/reindex service, embedding abstraction, vector-store abstraction, retrieval telemetry or knowledge admin API.

## Implementation decision

Add a portable `KnowledgeVectorStore` backed by the current database. Embeddings are stored as JSON vectors and cosine similarity is calculated in the retrieval service, combined with keyword and metadata scores. This avoids changing the production database image and works in CI without an external service. The adapter boundary allows a future pgvector implementation without changing the chat engine. A deterministic local embedding provider is the safe default; Vercel AI Gateway embeddings are used only when `AI_EMBEDDING_MODEL` and the gateway key are configured.

## Migration and files

Create `ai_knowledge_documents` and `ai_knowledge_chunks`, indexes for active/type/scope lookup, RAG modules under `artifacts/api-server/src/ai/rag`, an admin API, an indexing command, seed knowledge, regression tests and operational documentation.

## Risks

- Application-side cosine search is suitable for the current knowledge volume, not millions of chunks.
- Provider embedding dimensions must remain consistent inside one index; changing the embedding model requires a full reindex.
- Imported knowledge is trusted admin content. Access-control metadata is retained for future private knowledge, but V1 retrieves only public records.
