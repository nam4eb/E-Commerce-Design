import { ragConfig } from "../rag.config";
import type { KnowledgeMetadata } from "../types";

export interface ParsedChunk {
  content: string;
  heading: string;
  tokenCount: number;
  metadata: KnowledgeMetadata;
}

const clean = (value: string) => value.replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\r/g, "")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

function windows(text: string, size: number, overlap: number) {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf(". ", end), text.lastIndexOf("\n", end));
      if (boundary > start + size * 0.55) end = boundary + 1;
    }
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks.filter(Boolean);
}

export function chunkDocument(content: string, metadata: KnowledgeMetadata = {}): ParsedChunk[] {
  const config = ragConfig();
  const normalized = clean(content);
  if (!normalized) return [];
  const sections: Array<{ heading: string; body: string }> = [];
  let heading = "";
  let body: string[] = [];
  const flush = () => {
    const value = body.join("\n").trim();
    if (value) sections.push({ heading, body: value });
    body = [];
  };
  for (const line of normalized.split("\n")) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+)$/) || line.match(/^(.{2,100}):\s*$/);
    if (match) { flush(); heading = match[1].trim(); }
    else body.push(line);
  }
  flush();
  if (!sections.length) sections.push({ heading: "", body: normalized });
  return sections.flatMap((section) => windows(section.body, config.chunkSize, config.chunkOverlap).map((part) => ({
    heading: section.heading,
    content: section.heading ? `${section.heading}\n${part}` : part,
    tokenCount: Math.ceil((section.heading.length + part.length) / 4),
    metadata: { ...metadata, heading: section.heading || undefined },
  })));
}

export { clean as normalizeDocumentContent };

