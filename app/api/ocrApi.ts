const OCR_API_BASE_URL = process.env.EXPO_PUBLIC_OCR_API_URL;

if (!OCR_API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_OCR_API_URL not set");
}

export async function callOcrApi(
  blob: Blob,
  filename: string,
  image_id: string
) {
  const formData = new FormData();

  formData.append("image_id", image_id);
  formData.append("file", blob, filename);

  const res = await fetch(`${OCR_API_BASE_URL}/ocr`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR failed: ${res.status} ${text}`);
  }

  return res.json();
}
