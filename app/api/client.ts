import axios from "axios";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Small helper to normalize errors
export function toMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const detail =
      (err.response?.data && JSON.stringify(err.response.data)) ||
      err.message ||
      "Request failed";
    return status ? `HTTP ${status}: ${detail}` : detail;
  }
  return String(err);
}
