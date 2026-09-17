# AI RAG knowledge layer

## Purpose

RAG supplies verified, relatively static document knowledge to the existing chatbot. It covers FAQ, store policy, warranty, manuals, installation, usage and technical explanations. Price, stock, active promotions and order state always come from commerce services. Deterministic sizing remains in the skill layer.

## Request flow

`POST /api/ai/chat` normalizes the question, resolves intent and entities, then `resolveAnswerSource` selects `PRODUCT_DB`, `INVENTORY`, `PROMOTION_DB`, `SKILL`, `RAG` or `GENERAL`. Only RAG intents create a query embedding. Retrieved chunks form a compact verified context for the existing small-model response generator.

## Storage and retrieval

- `ai_knowledge_documents` stores type, source, scope, status, version, checksum, canonical content and metadata.
- `ai_knowledge_chunks` stores heading-aware chunks, token estimates, metadata and persisted embedding vectors.
- Retrieval combines cosine similarity, keyword overlap and metadata priority.
- Scope fallback order is product/model, brand, category, then global.
- Only active, public documents are retrieved. Product-specific, official and newer documents receive priority.
- Results below `RAG_MIN_SCORE` are discarded. An unknown answer returns a transparent unavailable message and never asks the model to use its own memory.

The current database adapter stores vectors as JSON and calculates cosine similarity in the API. This preserves PostgreSQL and SQLite compatibility. `KnowledgeVectorStore` is the boundary for adding pgvector when the corpus outgrows application-side scoring.

## Ingestion and chunking

`KnowledgeIndexer` cleans HTML/text, preserves Markdown or colon-style headings, creates overlapping semantic sections, enriches metadata, embeds batches and replaces obsolete chunks in one transaction. SHA-256 checksums skip unchanged content.

Run the seed/reindex command:

```powershell
pnpm run ai:index-knowledge
```

Existing `shop_content` records with usable bodies are imported as FAQ/policy knowledge. Seed documents contain store policy, an Inverter explanation and a model-scoped warranty example. Dynamic product fields such as price and stock are never indexed.

## Admin API

All routes require an authenticated admin session and the normal `x-store-request: 1` write header.

- `GET /api/admin/ai/knowledge`
- `POST /api/admin/ai/knowledge`
- `PUT /api/admin/ai/knowledge/:id`
- `POST /api/admin/ai/knowledge/:id/reindex`
- `PATCH /api/admin/ai/knowledge/:id/status`
- `DELETE /api/admin/ai/knowledge/:id`

A create/update body accepts `title`, `type`, `content`, `sourceType`, `sourceName`, optional `brandId`, `categoryId`, `productId`, `model`, `status`, `version` and `metadata`. Content that resembles credentials or API secrets is rejected. V1 retrieves only metadata with `access: public`.

## Configuration

```dotenv
AI_EMBEDDING_MODEL=local-hash-v1
RAG_TOP_K=5
RAG_MIN_SCORE=0.35
RAG_CHUNK_SIZE=900
RAG_CHUNK_OVERLAP=120
SEED_AI_KNOWLEDGE=true
```

`local-hash-v1` is deterministic, free and suitable for development and the current small Vietnamese corpus. Set `AI_EMBEDDING_MODEL` to a supported Vercel AI Gateway embedding model to use hosted embeddings. After changing embedding models, reindex every document so stored and query vectors have matching dimensions.

## Testing

```powershell
pnpm run test:rag
pnpm run eval:ai
pnpm run test:commerce
pnpm run typecheck
```

RAG tests never call a paid API. They cover chunking, embeddings, checksum skip, metadata filtering, source routing, scoped retrieval, hallucination guard and active/new source priority.

## Debugging incorrect answers

Inspect the response `source` and `sources` fields, then check structured logs for `ragUsed`, retrieval latency, chunk count, top score, document IDs and embedding model. Confirm the intent routes to RAG, the document is active/public, metadata matches the model/brand/category, and all documents were reindexed after an embedding model change. Raise or lower `RAG_MIN_SCORE` only after reviewing regression cases.
