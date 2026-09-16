import { readFileSync } from "node:fs";
import type { ChatIntent } from "../taxonomy";

export type DatasetSplit = "train" | "validation" | "test";

export interface TrainingRecord {
  id: string;
  family_id: string;
  split: DatasetSplit;
  style: "natural" | "no_accent" | "slang";
  question: string;
  intent: ChatIntent;
  skill: string | null;
  entities: Record<string, unknown>;
  expected_action: string;
  backend_sources: string[];
  response_strategy: string;
  must_do: string[];
  must_not: string[];
  clarification_question: string | null;
  notes: string | null;
}

/** Development/evaluation loader. It is never imported by the HTTP chat path. */
export function loadTrainingDataset(path: string): TrainingRecord[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as TrainingRecord;
      } catch (error) {
        throw new Error(
          `Dataset JSONL không hợp lệ ở dòng ${index + 1}: ${(error as Error).message}`,
        );
      }
    });
}
