// app/api/dyslexia.ts

export interface DyslexiaSentence {
  text: string;
  probability: number;
  label: string; // "NORMAL" | "DYSLEXIC"
}

export interface DyslexiaResponse {
  essay_label: string;
  confidence: number; // 0–1
  total_sentences: number;
  dyslexic_sentences: number;
  sentences: DyslexiaSentence[];
}

/**
 * Base API Gateway URL
 */
const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();

if (!GATEWAY_BASE) {
  throw new Error(
    "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY to call the dyslexia detection service."
  );
}

/**
 * Dyslexia Detection Service Base URL
 * FE → API Gateway → Dyslexia Detection Service
 */
const DYSLEXIA_DETECTION_API_URL = `${GATEWAY_BASE.replace(/\/+$/g, "")}/dyslexic-pattern-detection-service`;

/**
 * Predict dyslexia for a Sinhala essay
 */
export async function predictDyslexia(
  essayText: string
): Promise<DyslexiaResponse> {
  try {
    if (!essayText?.trim()) {
      throw new Error("Dyslexia prediction requires non-empty essay text.");
    }

    const url = `${DYSLEXIA_DETECTION_API_URL.replace(/\/+$/g, "")}/predict`;

    console.log("🧠 Calling Dyslexia Detection Service:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ essay: essayText })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Dyslexia API error (${response.status}):`, errorText);
      throw new Error(`Dyslexia API returned ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as DyslexiaResponse;

    console.log("✅ Dyslexia prediction received:", data);

    return data;
  } catch (error: any) {
    console.error("❌ Failed to predict dyslexia:", error.message);
    throw error;
  }
}

export default {
  predictDyslexia
};
