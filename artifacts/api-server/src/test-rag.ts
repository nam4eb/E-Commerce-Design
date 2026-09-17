import assert from "node:assert/strict";

process.env.DATABASE_FILE = ":memory:";
process.env.AI_EMBEDDING_MODEL = "local-hash-v1";
process.env.RAG_MIN_SCORE = "0.30";
delete process.env.DATABASE_URL;
delete process.env.AI_GATEWAY_API_KEY;

const { openCommerceDatabase } = await import("@workspace/db/commerce");
const { answerChat } = await import("./ai/chat-engine");
const { chunkDocument } = await import("./ai/rag/ingestion/chunker");
const { createRAGServices } = await import("./ai/rag/rag.service");
const { seedKnowledge } = await import("./ai/rag/seed");
const { resolveAnswerSource } = await import("./ai/rag/source-router");

const db = await openCommerceDatabase();
let passed = 0;
const test = async (name: string, work: () => Promise<void> | void) => {
  await work(); passed++; console.log(`PASS ${name}`);
};

try {
  await test("heading-aware chunking", () => {
    const chunks = chunkDocument("# Bảo hành\nMáy nén được bảo hành.\n# Lắp đặt\nKhảo sát vị trí.");
    assert.equal(chunks.length, 2); assert.equal(chunks[0].heading, "Bảo hành");
  });
  const firstSeed = await seedKnowledge(db);
  await test("seed stores embeddings", async () => {
    assert.ok(firstSeed.length >= 4);
    const chunks = await createRAGServices(db).store.listActiveChunks();
    assert.ok(chunks.length >= 4); assert.ok(chunks.every(({ chunk }) => chunk.embedding.length === 384));
  });
  await test("checksum skips unchanged document", async () => {
    const second = await seedKnowledge(db);
    assert.ok(second.every((item) => item.status === "skipped"));
  });
  await test("metadata and product scoped retrieval", async () => {
    const results = await createRAGServices(db).retriever.searchWithFallback({
      query: "FTKB35 bảo hành máy nén bao lâu", type: "WARRANTY", model: "FTKB35",
    });
    assert.equal(results[0]?.document.id, "daikin-ftkb35-warranty-v2");
    assert.equal(results[0]?.scope, "product");
  });
  await test("source routing keeps dynamic data outside RAG", () => {
    assert.equal(resolveAnswerSource("PRODUCT_PRICE"), "PRODUCT_DB");
    assert.equal(resolveAnswerSource("PRODUCT_STOCK"), "INVENTORY");
    assert.equal(resolveAnswerSource("AIR_CONDITIONER_SIZING"), "SKILL");
    assert.equal(resolveAnswerSource("WARRANTY"), "RAG");
  });
  await test("RAG-001 inverter technical knowledge", async () => {
    const result = await answerChat(db, "Điều hòa inverter là gì?", {});
    assert.equal(result.response.intent, "PRODUCT_TECH_EXPLAIN");
    assert.equal(result.response.source, "RAG"); assert.equal(result.ragTrace?.ragUsed, true);
    assert.ok(result.response.sources?.some((source) => source.documentId === "tech-inverter-v1"));
  });
  await test("RAG-002 FTKB35 product scoped warranty", async () => {
    const result = await answerChat(db, "FTKB35 bảo hành máy nén bao lâu?", {});
    assert.equal(result.response.intent, "WARRANTY"); assert.equal(result.response.source, "RAG");
    assert.equal(result.response.sources?.[0]?.documentId, "daikin-ftkb35-warranty-v2");
  });
  await test("RAG-003 return policy", async () => {
    const result = await answerChat(db, "Shop có đổi trả không?", {});
    assert.equal(result.response.intent, "RETURN_EXCHANGE"); assert.equal(result.response.source, "RAG");
  });
  await test("RAG-004 price bypasses RAG", async () => {
    const result = await answerChat(db, "FTKB35 giá bao nhiêu?", {});
    assert.equal(result.response.source, "PRODUCT_DB"); assert.equal(result.ragTrace, undefined);
  });
  await test("RAG-005 stock bypasses RAG", async () => {
    const result = await answerChat(db, "FTKB35 còn hàng không?", {});
    assert.equal(result.response.source, "INVENTORY"); assert.equal(result.ragTrace, undefined);
  });
  await test("RAG-006 unknown knowledge does not hallucinate", async () => {
    const result = await answerChat(db, "Model XYZ999 bảo hành bộ phận lượng tử bao lâu?", {});
    assert.equal(result.response.source, "RAG"); assert.equal(result.response.responseType, "limitation");
  });
  await test("RAG-007 obsolete source is not retrieved", async () => {
    const services = createRAGServices(db);
    await services.indexer.indexDocument({ id: "old-conflict", title: "Old", type: "WARRANTY", sourceType: "manual", sourceName: "old", model: "ABC123", status: "obsolete", version: 1, content: "ABC123 bảo hành 9 năm." });
    await services.indexer.indexDocument({ id: "new-conflict", title: "New", type: "WARRANTY", sourceType: "manual", sourceName: "new", model: "ABC123", status: "active", version: 2, metadata: { official: true }, content: "ABC123 bảo hành 2 năm." });
    const results = await services.retriever.searchWithFallback({ query: "ABC123 bảo hành bao lâu", type: "WARRANTY", model: "ABC123" });
    assert.equal(results[0]?.document.id, "new-conflict"); assert.ok(results.every((item) => item.document.id !== "old-conflict"));
  });
  console.log(`RAG tests: ${passed}/${passed} passed`);
} finally {
  await db.close();
}

