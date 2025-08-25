// app/api/client.ts
import axios from "axios";

// Pick up backend URL from .env or fall back to localhost
const baseURL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Helper to normalize error messages for UI
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

// 👇 Add a default export to silence Expo Router warning
export default api;
