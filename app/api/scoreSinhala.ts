import { api } from "./client";

export interface SinhalaScorePayload {
  text: string;
  grade: number;
  topic?: string;
}

export interface SinhalaScoreResponse {
  score: number;

  details: {
    model: string;
    grade: number;
    topic?: string;
    dyslexic_flag: boolean;
    error_tags: string[];
    source: string;
    [key: string]: any;
  };

  rubric: {
    richness_5: number | null;
    organization_6: number | null;
    technical_3: number | null;
    total_14: number | null;
  };

  fairness_report: {
    spd: number;
    dir: number;
    eod: number;
    mitigation_used: string;
  };
}

export async function scoreSinhala(
  payload: SinhalaScorePayload
): Promise<SinhalaScoreResponse> {
  try {
    const res = await api.post("/score-sinhala-ml", payload);
    return res.data as SinhalaScoreResponse;
  } catch (err: any) {
    console.log(" Sinhala ML API Error:", err.response?.data || err);
    throw err;
  }
}
