// app/api/batchTextFeedback.ts

export interface BatchFeedbackRequest {
  essay_id: string;
  text: string;
}

export interface BatchFeedbackPayload {
  requests: BatchFeedbackRequest[];
}

export interface BatchFeedbackSummary {
  common_suggestions: string[];
  essay_ids_processed: string[];
}

export interface BatchFeedbackResponse {
  total: number;
  summary: BatchFeedbackSummary;
}

const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();
if (!GATEWAY_BASE) {
  throw new Error(
    "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY to call the feedback service."
  );
}
const FEEDBACK_API_BASE_URL = `${GATEWAY_BASE.replace(/\/+$/g, "")}/sinhala-text-feedback-service`;

/**
 * Fetch batch feedback for multiple essays from the feedback service
 * @param requests - Array of essay IDs and their text content
 * @returns Promise<BatchFeedbackResponse>
 */
export async function fetchBatchTextFeedback(
  requests: BatchFeedbackRequest[]
): Promise<BatchFeedbackResponse> {
  try {
    if (!requests || requests.length === 0) {
      throw new Error("No essays provided for batch feedback");
    }

    console.log(
      `📤 Fetching batch feedback for ${requests.length} essays:`,
      requests.map((r) => r.essay_id)
    );

    const payload: BatchFeedbackPayload = { requests };
    const url = `${FEEDBACK_API_BASE_URL.replace(/\/+$/g, "")}/feedback/batch`;
    console.log("🔗 Full API URL being called:", url);
    console.log("📦 Request method: POST");
    console.log("📦 Request payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response statusText:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Batch Feedback API error (${response.status}):`,
        errorText
      );
      throw new Error(
        `Batch Feedback API returned ${response.status}: ${errorText}`
      );
    }

    const data: BatchFeedbackResponse = await response.json();
    console.log("✅ Batch feedback received successfully:", data);

    return data;
  } catch (error: any) {
    console.error("❌ Failed to fetch batch text feedback:", error.message);
    throw error;
  }
}
