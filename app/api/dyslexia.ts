// app/api/dyslexia.ts

/**
 * ===============================
 * 🔹 TYPES
 * ===============================
 */

export interface BinaryDyslexiaResponse {
  essay_label: "DYSLEXIC ESSAY" | "NORMAL ESSAY";
  confidence: number;
  total_sentences: number;
  dyslexic_sentences: number;
}
export interface PatternResponse {
  dominant: string;
  severity: string;
  explanation: string;

  risk_score: number;
  risk_level: string;

  distribution: Record<string, number>;

  pattern_density: Record<string, number>;
  pattern_sentence_count: Record<string, number>;
  pattern_sentence_examples: Record<string, string[]>;
  total_sentences: number;
}

/**
 * Combined analyze response
 */
export interface AnalyzeResponse
  extends BinaryDyslexiaResponse, PatternResponse {}

/**
 * ===============================
 * 🔹 API BASE
 * ===============================
 */

const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();

if (!GATEWAY_BASE) {
  throw new Error("API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY.");
}

const BASE_URL = `${GATEWAY_BASE.replace(/\/+$/g, "")}/dyslexic-pattern-detection-service`;

/**
 * ===============================
 * 🔹 1️⃣ BINARY DETECTION
 * ===============================
 */

export async function predictBinary(
  essayText: string
): Promise<BinaryDyslexiaResponse> {
  if (!essayText?.trim()) {
    throw new Error("Binary dyslexia prediction requires essay text.");
  }

  const url = `${BASE_URL}/predict`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essay: essayText })
  });

  if (!response.ok) {
    throw new Error(`Binary API returned ${response.status}`);
  }

  return (await response.json()) as BinaryDyslexiaResponse;
}

/**
 * ===============================
 * 🔹 2️⃣ PATTERN ANALYSIS
 * ===============================
 */

export async function predictPatterns(
  essayText: string
): Promise<PatternResponse> {
  if (!essayText?.trim()) {
    throw new Error("Pattern analysis requires essay text.");
  }

  const url = `${BASE_URL}/patterns`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essay: essayText })
  });

  if (!response.ok) {
    throw new Error(`Pattern API returned ${response.status}`);
  }

  return (await response.json()) as PatternResponse;
}

/**
 * ===============================
 * 🔹 3️⃣ FULL ANALYSIS (Binary + Patterns)
 * ===============================
 */

export async function analyzeDyslexia(
  essayText: string
): Promise<AnalyzeResponse> {
  if (!essayText?.trim()) {
    throw new Error("Full analysis requires essay text.");
  }

  const url = `${BASE_URL}/analyze`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essay: essayText })
  });

  if (!response.ok) {
    throw new Error(`Analyze API returned ${response.status}`);
  }

  return (await response.json()) as AnalyzeResponse;
}
