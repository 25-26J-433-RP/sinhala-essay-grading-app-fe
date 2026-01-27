// app/api/aiCorrection.ts
/**
 * AI Correction Service
 * 
 * Communicates with the AI Recorrection Workbench backend
 * for dyslexia-related text correction.
 */

import { api, toMessage } from "./client";
import axios from "axios";

// ===========================
// Types & Interfaces
// ===========================

export interface CorrectionItem {
  word: string;
  type?: "error" | "correct" | string;
  suggestion: string;
  pattern: string;
  confidence: number;
  explanation?: string;
  position?: { start: number; end: number };
}

export interface AnalyzeRequest {
  text: string;
  debug?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  original_text: string;
  corrected_text: string;
  total_errors: number;
  corrections: CorrectionItem[];
  processing_time_ms?: number;
  model_used?: string;
}

// Raw backend response structure
interface BackendWordAnalysis {
  word: string;
  type: "error" | "correct";
  dyslexiaPattern?: string;
  dyslexia_pattern?: string;
  suggestion?: string;
  explanation?: string;
  confidence?: number;
  source?: string;
}

interface BackendAnalyzeResponse {
  success: boolean;
  data: BackendWordAnalysis[];
  correctedText?: string;
  corrected_text?: string;
  originalText?: string;
  original_text?: string;
  processingTimeMs?: number;
  processing_time_ms?: number;
  modelUsed?: string;
  model_used?: string;
}

export interface HealthResponse {
  status: string;
  ollama_connected?: boolean;
  ollamaConnected?: boolean;  // Backend can return camelCase
  model_loaded?: boolean;
  model_name?: string;
  modelStatus?: string;
  version?: string;
}

export interface PatternInfo {
  name: string;
  description: string;
  examples?: string[];
}

export interface PatternsResponse {
  patterns: PatternInfo[];
}

// ===========================
// API Service
// ===========================

// Direct URL to AI Recorrection Workbench backend
// For local dev: http://localhost:8000/api/v1
// For production: set via environment or use API gateway
const AI_CORRECTION_DIRECT_URL = process.env.EXPO_PUBLIC_AI_CORRECTION_URL || "http://localhost:8000/api/v1";
const AI_CORRECTION_GATEWAY_PATH = "/ai-recorrection-workbench/api/v1";

const TIMEOUT_MS = 60000; // 60 seconds for AI analysis

// Create a separate axios instance for direct AI Correction calls
const aiCorrectionApi = axios.create({
  baseURL: AI_CORRECTION_DIRECT_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Check health of the AI Recorrection Workbench service
 */
export async function checkAICorrectionHealth(): Promise<HealthResponse> {
  // Try direct connection to localhost
  try {
    console.log("🔍 Checking AI Correction health at:", AI_CORRECTION_DIRECT_URL);
    const response = await aiCorrectionApi.get('/health');
    console.log("✅ AI Correction service is healthy:", response.data);
    return response.data;
  } catch (directErr: any) {
    console.log("⚠️ Direct AI Correction connection failed:", directErr.message);
    
    // Try via API Gateway as fallback
    try {
      const response = await api.get(`${AI_CORRECTION_GATEWAY_PATH}/health`, {
        timeout: 10000,
      });
      return response.data;
    } catch (gatewayErr) {
      console.error("❌ AI Correction health check failed on both direct and gateway");
      throw new Error("AI Correction service unavailable");
    }
  }
}

// ===========================
// Text Preprocessing
// ===========================

/**
 * Clean OCR text before AI analysis
 * Removes common OCR artifacts and normalizes text
 * 
 * @param text - Raw OCR text
 * @returns Cleaned text ready for AI analysis
 */
export function cleanOCRText(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  // 1. Normalize whitespace - replace multiple spaces/tabs with single space
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  
  // 2. Normalize line breaks - replace multiple newlines with double newline (paragraph)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  
  // 3. Remove leading/trailing whitespace from each line
  cleaned = cleaned.split("\n").map(line => line.trim()).join("\n");
  
  // 4. Remove common OCR artifacts
  // - Stray punctuation at start of lines
  cleaned = cleaned.replace(/^[.,:;!?]+\s*/gm, "");
  
  // 5. Fix common OCR issues with Sinhala characters
  // - Remove zero-width characters that may interfere
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
  
  // 6. Remove duplicate punctuation
  cleaned = cleaned.replace(/([.!?])\1+/g, "$1");
  
  // 7. Normalize Sinhala punctuation (if applicable)
  // - Replace ellipsis with proper three dots
  cleaned = cleaned.replace(/…/g, "...");
  
  // 8. Remove lines that are only punctuation or symbols
  cleaned = cleaned.split("\n").filter(line => {
    const stripped = line.replace(/[\s\p{P}\p{S}]/gu, "");
    return stripped.length > 0;
  }).join("\n");
  
  // 9. Final trim
  cleaned = cleaned.trim();
  
  console.log("🧹 Cleaned OCR text:", {
    originalLength: text.length,
    cleanedLength: cleaned.length,
    reduction: `${Math.round((1 - cleaned.length / text.length) * 100)}%`
  });
  
  return cleaned;
}

/**
 * Analyze Sinhala text for dyslexic writing errors
 * 
 * @param text - The Sinhala text to analyze
 * @param debug - Enable debug mode for additional info
 * @returns Analysis result with corrections
 */
export async function analyzeText(
  text: string,
  debug: boolean = false
): Promise<AnalyzeResponse> {
  try {
    // Send raw text to preserve structure and content
    // const cleanedText = cleanOCRText(text); 
    console.log("🧠 Sending text to AI Correction service at:", AI_CORRECTION_DIRECT_URL);
    
    const response = await aiCorrectionApi.post<BackendAnalyzeResponse>(
      '/analyze',
      { text: text, debug, include_correct_words: true },
      { timeout: TIMEOUT_MS }
    );

    const backendData = response.data;
    console.log("📥 Backend response:", backendData);

    // Map backend response to frontend format
    // Map backend response to frontend format - KEEP ALL TOKENS
    const tokens: CorrectionItem[] = (backendData.data || []).map((item) => ({
      word: item.word,
      type: item.type, // 'error' or 'correct'
      suggestion: item.suggestion || item.word,
      pattern: item.dyslexiaPattern || item.dyslexia_pattern || "Unknown",
      confidence: item.confidence ?? 0.8,
      explanation: item.explanation,
    }));

    const result: AnalyzeResponse = {
      success: backendData.success,
      original_text: backendData.originalText || backendData.original_text || text,
      corrected_text: backendData.correctedText || backendData.corrected_text || text,
      total_errors: tokens.filter(t => t.type === 'error').length,
      corrections: tokens, // Now contains ALL tokens
      processing_time_ms: backendData.processingTimeMs || backendData.processing_time_ms,
      model_used: backendData.modelUsed || backendData.model_used,
    };

    console.log("✅ AI Correction analysis complete:", result);
    return result;
  } catch (error) {
    console.error("❌ AI Correction analysis failed:", error);
    throw new Error(toMessage(error));
  }
}

/**
 * Get available dyslexia patterns
 */
export async function getPatterns(): Promise<PatternsResponse> {
  try {
    const response = await api.get(`${AI_CORRECTION_GATEWAY_PATH}/patterns`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Failed to get patterns:", error);
    throw new Error(toMessage(error));
  }
}

/**
 * Apply accepted corrections to text
 * 
 * @param originalText - The original text
 * @param corrections - List of corrections with accept/reject status
 * @returns The corrected text
 */
export function applyCorrections(
  originalText: string,
  corrections: Array<CorrectionItem & { accepted: boolean }>
): string {
  let result = originalText;
  
  // Sort by position descending to maintain correct indices
  const sortedCorrections = [...corrections]
    .filter(c => c.accepted)
    .sort((a, b) => {
      if (a.position && b.position) {
        return b.position.start - a.position.start;
      }
      return 0;
    });

  // Apply corrections from end to start to preserve positions
  for (const correction of sortedCorrections) {
    if (correction.position) {
      result = 
        result.slice(0, correction.position.start) +
        correction.suggestion +
        result.slice(correction.position.end);
    } else {
      // Fallback: simple replacement (may replace multiple occurrences)
      result = result.replace(correction.word, correction.suggestion);
    }
  }

  return result;
}

// Default export
const aiCorrectionService = {
  checkHealth: checkAICorrectionHealth,
  analyzeText,
  getPatterns,
  applyCorrections,
};

export default aiCorrectionService;
