import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { toApiError } from "./api-errors";

/**
 * Cookie-authenticated API client.
 * - Sends the double-submit CSRF token on unsafe methods (fetched once, refreshed on CSRF_FAILED).
 * - On 401, performs ONE shared refresh (single-flight) and replays the request.
 * - Rejects with ApiError so callers never see raw Axios errors.
 */
export const api = axios.create({
  baseURL:  process.env.API_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

type RetryableConfig = InternalAxiosRequestConfig & {
  _csrfRetried?: boolean;
  _authRetried?: boolean;
  _skipAuthRefresh?: boolean;
};

const UNSAFE = new Set(["post", "put", "patch", "delete"]);
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/csrf"];

let csrfToken: string | null = null;
let csrfInFlight: Promise<string> | null = null;

function ensureCsrf(force = false): Promise<string> {
  if (csrfToken && !force) {
    return Promise.resolve(csrfToken);
  }

  csrfInFlight ??= api
    .get<{ csrfToken: string }>("/auth/csrf")
    .then((r) => (csrfToken = r.data.csrfToken))
    .finally(() => {
      csrfInFlight = null;
    });

  return csrfInFlight;
}

let refreshInFlight: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const attempt = () => api.post("/auth/refresh", undefined, { _skipAuthRefresh: true } as AxiosRequestConfig);
  try {
    await attempt();
  } catch {
    // Another tab may have rotated the token a moment ago; the cookie jar now holds
    // the newer one, so one more try succeeds without logging the user out.
    await new Promise((r) => setTimeout(r, 300));
    await attempt();
  }
}

function refreshSession(): Promise<void> {
  refreshInFlight ??= doRefresh().finally(() => (refreshInFlight = null));
  return refreshInFlight;
}

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

api.interceptors.request.use(async (config) => {
  if (UNSAFE.has((config.method ?? "get").toLowerCase())) {
    config.headers.set("X-CSRF-Token", await ensureCsrf());
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryableConfig | undefined;
    const apiError = toApiError(error);
    if (!config) throw apiError;

    if (apiError.code === "CSRF_FAILED" && !config._csrfRetried) {
      config._csrfRetried = true;
      await ensureCsrf(true);
      return api(config);
    }

    const path = config.url ?? "";
    const refreshable =
      apiError.status === 401 &&
      !config._authRetried &&
      !config._skipAuthRefresh &&
      !NO_REFRESH_PATHS.some((p) => path.startsWith(p));

    if (refreshable) {
      config._authRetried = true;
      try {
        await refreshSession();
      } catch {
        onSessionExpired?.();
        throw apiError;
      }
      return api(config);
    }
    throw apiError;
  },
);

export function resetClientSecurityState() {
  csrfToken = null;
}
