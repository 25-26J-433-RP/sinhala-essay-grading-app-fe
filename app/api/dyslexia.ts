const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();

if (!GATEWAY_BASE) {
  throw new Error(
    "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY to call the dyslexia service."
  );
}

const gateway = GATEWAY_BASE.replace(/\/+$/g, "");

export interface DyslexiaBinaryResponse {
  essay_label: string;
  confidence: number;
  [key: string]: unknown;
}

export interface DyslexiaPatternsResponse {
  dominant: string;
  risk_level: string;
  severity: string;
  explanation: string;
  distribution: Record<string, number>;
  risk_score: number;
  pattern_density: number;
  pattern_sentence_count: number;
  pattern_sentence_examples: string[];
  total_sentences: number;
  [key: string]: unknown;
}

async function postJson<T>(url: string, payload: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Dyslexia API failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function predictBinary(text: string): Promise<DyslexiaBinaryResponse> {
  return postJson<DyslexiaBinaryResponse>(
    `${gateway}/dyslexia-detection-model/predict-binary`,
    { text }
  );
}

export async function predictPatterns(
  text: string
): Promise<DyslexiaPatternsResponse> {
  return postJson<DyslexiaPatternsResponse>(
    `${gateway}/dyslexia-detection-model/predict-patterns`,
    { text }
  );
}
