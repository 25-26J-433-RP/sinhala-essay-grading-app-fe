import axios from "axios";

const gateway = process.env.EXPO_PUBLIC_API_GATEWAY?.trim();

if (!gateway) {
  throw new Error(
    "EXPO_PUBLIC_API_GATEWAY is not defined. Check your .env file."
  );
}

export const api = axios.create({
  baseURL: gateway,
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

export default api;
