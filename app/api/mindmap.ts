// app/api/mindmap.ts
import { api, toMessage } from "./client";

/**
 * Retry configuration for API calls
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 5000, // 5 seconds
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @param operationName - Name of operation for logging
 */
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = "Operation"
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 ${operationName} - Attempt ${attempt} of ${config.maxAttempts}`);
      }
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on client errors (4xx) or missing configuration
      if (lastError.message.includes("API gateway not configured") ||
          lastError.message.includes("No text provided") ||
          (err instanceof Error && err.message.includes("400")) ||
          (err instanceof Error && err.message.includes("401")) ||
          (err instanceof Error && err.message.includes("403")) ||
          (err instanceof Error && err.message.includes("404"))) {
        throw lastError;
      }
      
      // Only retry on server errors (5xx), timeouts, or network errors
      if (attempt < config.maxAttempts &&
          (lastError.message.includes("502") ||
           lastError.message.includes("503") ||
           lastError.message.includes("504") ||
           lastError.message.includes("timeout") ||
           lastError.message.includes("Network") ||
           lastError.message.includes("ECONNREFUSED") ||
           lastError.message.includes("ETIMEDOUT"))) {
        
        const delaySecs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        ) / 1000;
        
        console.warn(
          `⚠️ ${operationName} failed (${lastError.message}). Retrying in ${delaySecs.toFixed(1)}s...`
        );
        
        await new Promise(resolve =>
          setTimeout(resolve, delaySecs * 1000)
        );
      } else if (attempt < config.maxAttempts) {
        // For unknown errors, don't retry
        throw lastError;
      }
    }
  }
  
  throw new Error(
    `${operationName} failed after ${config.maxAttempts} attempts: ${lastError?.message}`
  );
}

export interface MindmapNode {
  id: string;
  label: string;
  level: number;
  type: "root" | "topic" | "subtopic";
  size?: number;
  importance?: number;
  color?: string;
  offset?: number;
  source_text?: string;
  source_type?: string;
  position?: {
    x: number;
    y: number;
  };
  order?: number;
}

export interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  confidence?: number;
  similarity?: number;
  proximity?: number;
  style?: string;
}

export interface MindmapMetadata {
  total_nodes: number;
  total_edges: number;
  text_length: number;
  entities_found?: number;
  relationships_found?: number;
  clusters?: number;
  intelligence_level?: string;
}

export interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  metadata: MindmapMetadata;
}

export interface MindmapResponse {
  success: boolean;
  data: MindmapData;
}

export interface GenerateMindmapPayload {
  essay_id: string;
  text: string; // Backend expects only `text`
}

export interface GenerateMindmapResponse {
  success: boolean;
  message: string;
  essay_id?: string;
}

/**
 * Generate mindmap for an essay
 * @param essayId - The ID of the essay
 * @param essayText - The text content of the essay
 * @returns Generation response
 */
export async function generateMindmap(
  essayId: string,
  essayText: string
): Promise<GenerateMindmapResponse> {
  return retryWithExponentialBackoff(
    async () => {
      const gateway = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();
      if (!gateway) {
        throw new Error(
          "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY in your environment to call the mindmap service."
        );
      }
      const path = `/sinhala-visual-mapping-service/api/mindmap/generate`;
      const url = `${gateway.replace(/\/+$/g, "")}${path}`;
      if (!essayText || !essayText.trim()) {
        throw new Error("Mindmap generation requires non-empty essay text");
      }
      const payload: GenerateMindmapPayload = {
        essay_id: essayId,
        text: essayText,
      };
      if (__DEV__) {
        // Lightweight debug trace (avoid logging full essay text if huge)
        console.log("🧠 generateMindmap payload", {
          essay_id: essayId,
          text_length: essayText.length,
        });
      }
      const response = await api.post(url, payload);
      return response.data;
    },
    DEFAULT_RETRY_CONFIG,
    `Mindmap generation for essay ${essayId}`
  ).catch((err) => {
    const msg = toMessage(err);
    // Enhance clarity for common errors
    if (/No text provided/i.test(msg)) {
      throw new Error(
        msg +
          " | Mindmap generation needs essay text. Ensure the TextInput contains the full essay before scoring."
      );
    }
    if (/502|503|504/.test(msg)) {
      throw new Error(
        msg +
          " | The mindmap service is temporarily unavailable. Please try again in a moment."
      );
    }
    throw new Error(msg);
  });
}

/**
 * Fetch mindmap data for a specific essay
 * @param essayId - The ID of the essay
 * @returns Mindmap data with nodes and edges
 */
export async function fetchMindmap(essayId: string): Promise<MindmapData> {
  return retryWithExponentialBackoff(
    async () => {
      const gateway = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();
      if (!gateway) {
        throw new Error(
          "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY in your environment to fetch mindmap data."
        );
      }
      const path = `/sinhala-visual-mapping-service/api/mindmap/essay/${essayId}`;
      const url = `${gateway.replace(/\/+$/g, "")}${path}`;
      const response = await api.get(url);
      // Accept both { success, data } and { data } shapes
      if (response.data) {
        if (response.data.success === true && response.data.data) {
          return response.data.data;
        }
        // If no success field, but data is present
        if (response.data.nodes && response.data.edges && response.data.metadata) {
          return response.data;
        }
        // If only data is present
        if (response.data.data && response.data.data.nodes) {
          return response.data.data;
        }
      }
      throw new Error("Failed to fetch mindmap data");
    },
    DEFAULT_RETRY_CONFIG,
    `Fetch mindmap for essay ${essayId}`
  ).catch((err) => {
    const msg = toMessage(err);
    if (/502|503|504/.test(msg)) {
      throw new Error(
        msg +
          " | The mindmap service is temporarily unavailable. Please try again in a moment."
      );
    }
    throw new Error(msg);
  });
}

export default { fetchMindmap, generateMindmap };
