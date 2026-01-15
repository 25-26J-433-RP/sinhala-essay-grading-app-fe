const API_GATEWAY = process.env.EXPO_PUBLIC_API_GATEWAY;

if (!API_GATEWAY) {
  throw new Error("EXPO_PUBLIC_API_GATEWAY not set");
}

export async function callOcrApi(
  blob: Blob,
  filename: string,
  image_id: string
) {
  const formData = new FormData();

  formData.append("image_id", image_id);
  formData.append("file", blob, filename);

  const res = await fetch(`${API_GATEWAY}/api/ocr`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR failed: ${res.status} ${text}`);
  }

  return res.json();
}
