// app/api/ocr.ts

export interface OcrResponse {
  image_id: string;
  raw_text: string;
  cleaned_text: string;
  image_url?: string;
  filename?: string;
}

/**
 * Run OCR via API Gateway
 * FE → API Gateway → OCR Service
 */
export async function runOcr(
  file: File,
  image_id: string
): Promise<OcrResponse> {
  const API_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();

  if (!API_BASE) {
    throw new Error("EXPO_PUBLIC_API_GATEWAY not configured");
  }

  // Build gateway URL
  const url = `${API_BASE.replace(/\/+$/, "")}` + `/sinhala-ocr-service/ocr`;

  // Prepare multipart/form-data
  const formData = new FormData();
  formData.append("image_id", image_id);
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR failed (${res.status}): ${text}`);
  }

  return (await res.json()) as OcrResponse;
}
