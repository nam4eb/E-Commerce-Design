import { ragConfig } from "./rag.config";
import type { KnowledgeSearchResult, KnowledgeSourceTrace } from "./types";

export function buildRAGContext(results: KnowledgeSearchResult[]) {
  const sources: KnowledgeSourceTrace[] = [];
  const blocks: string[] = [];
  let length = 0;
  for (const result of results) {
    if (sources.some((source) => source.documentId === result.document.id && source.title === result.document.title)) continue;
    const block = `[${result.document.title} | ${result.document.type} | phiên bản ${result.document.version}]\n${result.chunk.content}`;
    if (length + block.length > ragConfig().maxContextChars) break;
    blocks.push(block); length += block.length;
    sources.push({
      documentId: result.document.id, title: result.document.title, type: result.document.type,
      sourceName: result.document.sourceName, version: result.document.version, score: result.score,
    });
  }
  return { context: blocks.join("\n\n"), sources };
}

