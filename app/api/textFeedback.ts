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

const FEEDBACK_API_BASE_URL =
  "https://sinhala-text-feedback-service-651457725719.europe-west1.run.app";

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

    const response = await fetch(`${FEEDBACK_API_BASE_URL}/feedback`, {
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
