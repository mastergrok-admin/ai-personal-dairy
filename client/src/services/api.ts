import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Refresh token queue management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  endpoint: string;
  options?: RequestOptions;
}> = [];

function processQueue(success: boolean) {
  failedQueue.forEach(({ resolve, reject, endpoint, options }) => {
    if (success) {
      resolve(request(endpoint, { ...options, _retry: true }));
    } else {
      reject(new Error("Session expired"));
    }
  });
  failedQueue = [];
}

// Endpoints that should not trigger a token refresh on 401
const NO_REFRESH_ENDPOINTS = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/me"];

interface RequestOptions extends RequestInit {
  silent?: boolean;
  _retry?: boolean;
}

async function request<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { silent, _retry, ...fetchOptions } = options || {};

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions?.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    // 401 handling with silent refresh
    if (
      response.status === 401 &&
      !_retry &&
      !NO_REFRESH_ENDPOINTS.some((ep) => endpoint.startsWith(ep))
    ) {
      if (isRefreshing) {
        // Queue this request while refresh is in-flight
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: resolve as (value: unknown) => void,
            reject,
            endpoint,
            options,
          });
        }) as Promise<T>;
      }

      isRefreshing = true;

      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshResponse.ok) {
          isRefreshing = false;
          processQueue(true);
          // Retry the original request
          return request<T>(endpoint, { ...options, _retry: true });
        } else {
          isRefreshing = false;
          processQueue(false);
          // Redirect to login
          window.location.href = "/login";
          throw new Error("Session expired");
        }
      } catch {
        isRefreshing = false;
        processQueue(false);
        window.location.href = "/login";
        throw new Error("Session expired");
      }
    }

    const error = await response.json().catch(() => ({}));
    const message = error.error || `Request failed: ${response.status}`;

    // Global error toasts (unless silent)
    if (!silent) {
      if (response.status === 403) {
        toast.error("You don't have permission to do this.");
      } else if (response.status >= 500) {
        toast.error("Something went wrong. Please try again.");
      }
    }

    throw new Error(message);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};
