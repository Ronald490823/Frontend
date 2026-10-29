import { isAxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  get hasFieldErrors() {
    return Object.keys(this.fields).length > 0;
  }
}

// Safe, human copy for known backend codes. Server messages are already safe, but these
// keep tone consistent and cover client-side failures.
const FRIENDLY: Record<string, string> = {
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
  TIMEOUT: "The server is taking too long to respond. Please try again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to do that.",
  CSRF_FAILED: "Your session security token is stale. Please refresh the page.",
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return new ApiError(0, "TIMEOUT", FRIENDLY.TIMEOUT);
    if (!error.response) return new ApiError(0, "NETWORK_ERROR", FRIENDLY.NETWORK_ERROR);
    const body = error.response.data as Partial<ApiErrorBody> | undefined;
    const code = body?.errorCode ?? (error.response.status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN");
    // Never surface raw 5xx bodies (could be a proxy HTML page or stack trace).
    const message =
      error.response.status >= 500 ? FRIENDLY.INTERNAL_ERROR : (body?.message ?? FRIENDLY[code] ?? "Request failed.");
    return new ApiError(error.response.status, code, message, body?.details?.fields ?? {}, body?.details ?? {});
  }
  return new ApiError(0, "UNKNOWN", "Something went wrong. Please try again.");
}

export function errorMessage(error: unknown): string {
  return toApiError(error).message;
}
