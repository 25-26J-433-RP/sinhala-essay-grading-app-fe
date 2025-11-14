import { api } from "./client";

export interface SinhalaScorePayload {
  text: string;
  grade: number;
  topic?: string;
}

export interface SinhalaScoreResponse {
  score: number;
  details: {
    strategy: string;
    word_count: number;
    unique_words: number;
    avg_word_length: number;
  };
  fairness_report: null;
}

export async function scoreSinhala(payload: SinhalaScorePayload): Promise<SinhalaScoreResponse> {
  const res = await api.post("/score-sinhala", payload);
  return res.data;
}
