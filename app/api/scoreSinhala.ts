import { api } from "./client";

export interface SinhalaScorePayload {
  text: string;
  grade: number;
  topic?: string;
  dyslexic_flag?: boolean;  // ✅ ADDED
  error_tags?: string[];     // ✅ ADDED
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
    mitigation_applied: boolean;
    method: string;
    protected_attribute: string;
    protected_value: any;
    grade: number;

    original_richness_5: number;
    original_organization_6: number;
    original_technical_3: number;
    original_total_14: number;

    adjusted_richness_5: number;
    adjusted_organization_6: number;
    adjusted_technical_3: number;
    adjusted_total_14: number;

    richness_multiplier: number;
    organization_multiplier: number;
    technical_multiplier: number;

    richness_boost: number;
    organization_boost: number;
    technical_boost: number;
    total_boost: number;

    justification: string;
    data_source: string;
    note?: string;

    rubric_notes: {
      scoring_method: string;
      theme_relevance: number;
      theme_penalty: number;
      word_count: number;
      word_count_penalty: number;
      technical_violations: string[];
      grammar_issues: string[];
      technical_penalty: number;
      grade_adjustment_factor: number;
    };
  };
}

export async function scoreSinhala(
  payload: SinhalaScorePayload
): Promise<SinhalaScoreResponse> {
  try {
    const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();
    if (!GATEWAY_BASE) {
      throw new Error(
        "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY."
      );
    }

    // Use the remote API gateway for the base URL
    const BASE_URL = GATEWAY_BASE;

    // Define the path for the remote scoring engine
    const path = "/bias-aware-scoring-engine/score-sinhala-ml";

    const url = `${BASE_URL.replace(/\/+$|\s+$/g, "")}${path}`;

    const res = await api.post(url, payload, {
      headers: {
        "X-API-KEY": process.env.EXPO_PUBLIC_INTERNAL_API_KEY || ""
      }
    });
    return res.data as SinhalaScoreResponse;
  } catch (err: any) {
    console.log("❌ Sinhala ML API Error:", err.response?.data || err);
    throw err;
  }
}

