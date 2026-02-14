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
  // Build URL: use local override or fallback to gateway
  const BASE_URL = process.env.EXPO_PUBLIC_OCR_URL || process.env.EXPO_PUBLIC_API_GATEWAY?.trim();

  if (!BASE_URL) {
    throw new Error("OCR URL or Gateway not configured.");
  }

  // If using local override, path is just /ocr. If gateway, it's prefixed.
  const isLocal = BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1");
  const path = isLocal ? "/ocr" : "/sinhala-ocr-service/ocr";

  const url = `${BASE_URL.replace(/\/+$/, "")}${path}`;

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
