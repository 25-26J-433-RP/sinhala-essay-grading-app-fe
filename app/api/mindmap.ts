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

/**
 * Fetch mindmap data for a specific essay
 * @param essayId - The ID of the essay
 * @returns Mindmap data with nodes and edges
 */
export async function fetchMindmap(essayId: string): Promise<MindmapData> {
  try {
    const baseOverride = process.env.EXPO_PUBLIC_MINDMAP_API_URL?.trim();
    // Updated endpoint path to match new service contract
    const path = `/api/mindmap/essay/${essayId}`;
    const base = baseOverride ? baseOverride.replace(/\/+$/g, "") : "";
    const url = base ? `${base}${path}` : path;
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

export default { fetchMindmap };
