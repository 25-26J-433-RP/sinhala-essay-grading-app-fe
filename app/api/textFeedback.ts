// app/api/textFeedback.ts

export interface TextFeedbackRequest {
  essay_id: string;
  text: string;
}

export interface TextMetrics {
  word_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  repetition_ratio: number;
  duplicate_word_count: number;
  char_length: number;
}

export interface TextFeedbackResponse {
  essay_id: string;
  original_text: string;
  feedback: string;
  suggestions: string[];
  score: number;
  metrics: TextMetrics;
}

const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();
if (!GATEWAY_BASE) {
  throw new Error(
    "API gateway not configured. Set EXPO_PUBLIC_API_GATEWAY to call the feedback service."
  );
}
const FEEDBACK_API_BASE_URL = `${GATEWAY_BASE.replace(/\/+$/g, "")}/sinhala-text-feedback-service`;

/**
 * Fetch personalized text feedback from the feedback service
 * @param essayId - The ID of the essay
 * @param essayText - The text content of the essay
 * @returns Promise<TextFeedbackResponse>
 */
export async function fetchTextFeedback(
  essayId: string,
  essayText: string
): Promise<TextFeedbackResponse> {
  try {
    console.log("📤 Fetching text feedback for essay:", essayId);

    const payload: TextFeedbackRequest = {
      essay_id: essayId,
      text: essayText,
    };

    const response = await fetch(`${FEEDBACK_API_BASE_URL.replace(/\/+$/g, "")}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Feedback API error (${response.status}):`,
        errorText
      );
      throw new Error(
        `Feedback API returned ${response.status}: ${errorText}`
      );
    }

    const data: TextFeedbackResponse = await response.json();
    console.log("✅ Text feedback received successfully:", data);

    return data;
  } catch (error: any) {
    console.error("❌ Failed to fetch text feedback:", error.message);
    throw error;
  }
}
