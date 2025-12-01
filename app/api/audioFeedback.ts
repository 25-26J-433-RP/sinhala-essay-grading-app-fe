// app/api/audioFeedback.ts

export interface AudioFeedbackRequest {
  essay_id: string;
  text: string;
}

export interface AudioFeedbackResponse {
  essay_id: string;
  audio_url?: string;
  audio_base64?: string;
  duration?: number;
  success: boolean;
  message?: string;
}

const AUDIO_FEEDBACK_API_URL =
  process.env.EXPO_PUBLIC_AUDIO_FEEDBACK_API_URL;

/**
 * Generate Sinhala audio feedback from text using Text-to-Speech service
 * @param essayId - The ID of the essay
 * @param feedbackText - The text feedback to convert to audio
 * @returns Promise<AudioFeedbackResponse>
 */
export async function generateAudioFeedback(
  essayId: string,
  feedbackText: string
): Promise<AudioFeedbackResponse> {
  try {
    if (!AUDIO_FEEDBACK_API_URL) {
      throw new Error(
        "EXPO_PUBLIC_AUDIO_FEEDBACK_API_URL environment variable not set"
      );
    }

    if (!essayId || !feedbackText?.trim()) {
      throw new Error("Essay ID and feedback text are required");
    }

    console.log("🎙️ Generating audio feedback for essay:", essayId);

    const payload: AudioFeedbackRequest = {
      essay_id: essayId,
      text: feedbackText,
    };

    const url = `${AUDIO_FEEDBACK_API_URL}/tts`;
    console.log("🔗 Audio TTS API URL:", url);
    console.log("📦 Request payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📡 TTS Response status:", response.status);
    console.log("📡 TTS Response statusText:", response.statusText);
    console.log("📡 TTS Response Content-Type:", response.headers.get("content-type"));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Audio Feedback API error (${response.status}):`,
        errorText
      );
      throw new Error(
        `Audio Feedback API returned ${response.status}: ${errorText}`
      );
    }

    // Check if response is JSON or binary audio data
    const contentType = response.headers.get("content-type");
    let data: AudioFeedbackResponse;

    if (contentType?.includes("application/json")) {
      // JSON response with audio URL or base64
      data = await response.json();
      console.log("✅ Audio feedback received (JSON):", data);
    } else if (contentType?.includes("audio/") || contentType?.includes("application/octet-stream")) {
      // Binary audio data - convert to base64
      console.log("🎵 Received binary audio data");
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          data = {
            essay_id: essayId,
            audio_base64: base64Audio,
            success: true,
            message: "Audio generated successfully",
          };
          console.log("✅ Audio feedback converted to base64");
          resolve(data);
        };
        reader.onerror = () => {
          reject(new Error("Failed to convert audio to base64"));
        };
        reader.readAsDataURL(blob);
      });
    } else {
      // Try to parse as JSON, fallback to base64
      try {
        data = await response.json();
        console.log("✅ Audio feedback received (JSON):", data);
      } catch (jsonError) {
        console.log("⚠️ Response is not JSON, treating as binary audio");
        const blob = await response.blob();
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            data = {
              essay_id: essayId,
              audio_base64: base64Audio,
              success: true,
              message: "Audio generated successfully",
            };
            console.log("✅ Audio feedback converted to base64");
            resolve(data);
          };
          reader.onerror = () => {
            reject(new Error("Failed to convert audio to base64"));
          };
          reader.readAsDataURL(blob);
        });
      }
    }

    return data;
  } catch (error: any) {
    console.error("❌ Failed to generate audio feedback:", error.message);
    throw error;
  }
}
