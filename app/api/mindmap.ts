// app/api/mindmap.ts
import { api, toMessage } from "./client";

export interface MindmapNode {
  id: string;
  label: string;
  level: number;
  type: "root" | "topic" | "subtopic";
  size: number;
}

export interface MindmapEdge {
  id: string;
  source: string;
  target: string;
  type: "hierarchy" | "relation";
}

export interface MindmapMetadata {
  total_nodes: number;
  total_edges: number;
  text_length: number;
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
  try {
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
  } catch (err) {
    const msg = toMessage(err);
    // Enhance clarity for common 400 missing text error
    if (/No text provided/i.test(msg)) {
      throw new Error(
        msg +
          " | Mindmap generation needs essay text. Ensure the TextInput contains the full essay before scoring."
      );
    }
    throw new Error(msg);
  }
}

/**
 * Fetch mindmap data for a specific essay
 * @param essayId - The ID of the essay
 * @returns Mindmap data with nodes and edges
 */
export async function fetchMindmap(essayId: string): Promise<MindmapData> {
  try {
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
  } catch (err) {
    throw new Error(toMessage(err));
  }
}

export default { fetchMindmap, generateMindmap };
