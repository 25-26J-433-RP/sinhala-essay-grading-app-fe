// app/api/ocrApi.ts

const OCR_API_URL =
  "https://sinhala-ocr-api-651457725719.asia-south1.run.app/ocr";

export interface OCRResponse {
  image_id: string;
  raw_text: string;
  cleaned_text: string;
  image_url: string;
  filename: string;
}

export async function callOcrApi(
  fileBlob: Blob,
  filename: string
): Promise<OCRResponse> {
  const formData = new FormData();
  formData.append("file", fileBlob, filename);

  const res = await fetch(OCR_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR failed: ${text}`);
  }

  return res.json();
}
