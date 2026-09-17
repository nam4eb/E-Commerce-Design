const integer = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

const decimal = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
};

export function ragConfig() {
  const chunkSize = integer("RAG_CHUNK_SIZE", 900, 300, 4000);
  return {
    topK: integer("RAG_TOP_K", 5, 1, 12),
    minScore: decimal("RAG_MIN_SCORE", 0.35, 0, 1),
    chunkSize,
    chunkOverlap: integer("RAG_CHUNK_OVERLAP", 120, 0, Math.floor(chunkSize / 2)),
    maxContextChars: integer("RAG_MAX_CONTEXT_CHARS", 6000, 1000, 16000),
    embeddingModel: process.env.AI_EMBEDDING_MODEL || "local-hash-v1",
  };
}
