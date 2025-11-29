import { api } from "./client";

export type FairnessReport = {
  spd: number;
  dir: number;
  eod: number;
  mitigation_used?: string | null;
};

export type ScoreResponse = {
  score: number;
  details: Record<string, unknown>;
  fairness_report: FairnessReport;
};

export async function scoreEssay(text: string, prompt?: string) {
  const payload = { text, prompt: prompt?.trim() || undefined };
  const { data } = await api.post<ScoreResponse>("/score", payload);
  return data;
}
