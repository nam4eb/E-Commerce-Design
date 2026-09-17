import { createHash } from "node:crypto";
import { normalizeText } from "../../normalization";
import { ragConfig } from "../rag.config";

export interface EmbeddingProvider {
  readonly model: string;
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export class LocalHashEmbeddingProvider implements EmbeddingProvider {
  readonly model = "local-hash-v1";
  constructor(private readonly dimensions = 384) {}

  async embedText(text: string): Promise<number[]> {
    const vector = Array<number>(this.dimensions).fill(0);
    const normalized = normalizeText(text);
    const terms = normalized.split(/\s+/).filter(Boolean);
    const features = [...terms, ...terms.slice(0, -1).map((term, index) => `${term}_${terms[index + 1]}`)];
    for (const feature of features) {
      const digest = createHash("sha256").update(feature).digest();
      const index = digest.readUInt32BE(0) % this.dimensions;
      vector[index] += digest[4] % 2 ? 1 : -1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }

  async embedTexts(texts: string[]) {
    return Promise.all(texts.map((text) => this.embedText(text)));
  }
}

export class GatewayEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  constructor(model = ragConfig().embeddingModel) {
    this.model = model;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const key = process.env.AI_GATEWAY_API_KEY;
    if (!key) throw new Error("AI_GATEWAY_API_KEY is required for gateway embeddings");
    const response = await fetch("https://ai-gateway.vercel.sh/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: texts }),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Embedding provider returned ${response.status}`);
    const body = (await response.json()) as { data?: Array<{ index: number; embedding: number[] }> };
    const sorted = [...(body.data || [])].sort((a, b) => a.index - b.index);
    if (sorted.length !== texts.length || sorted.some((item) => !Array.isArray(item.embedding)))
      throw new Error("Embedding provider returned an invalid response");
    return sorted.map((item) => item.embedding);
  }

  async embedText(text: string) {
    return (await this.embedTexts([text]))[0];
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const model = ragConfig().embeddingModel;
  return model === "local-hash-v1"
    ? new LocalHashEmbeddingProvider()
    : new GatewayEmbeddingProvider(model);
}

