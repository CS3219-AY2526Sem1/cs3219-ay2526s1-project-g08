/**
 * API Utility
 *
 * Wrapper around fetch that automatically handles token refresh on 401 errors.
 * Use this for all authenticated API calls to the backend.
 */

import { refreshAccessToken } from "./tokenRefresh";
import config from '../config/environment';

const API_BASE_URL = config.api.baseUrl;

/**
 * Enhanced fetch that handles token refresh on 401 errors
 *
 * @param endpoint - API endpoint (e.g., '/user/profile')
 * @param options - Fetch options
 * @returns Response from the API
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ensure credentials are included to send cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
  };

  // Build full URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  try {
    // First attempt
    let response = await fetch(url, fetchOptions);

    // If we get 401 (Unauthorized), try to refresh the token
    if (response.status === 401) {
      console.log("🔓 Got 401, attempting token refresh...");

      const refreshed = await refreshAccessToken();

      if (refreshed) {
        console.log("✓ Token refreshed, retrying original request...");
        // Retry the original request with the new token
        response = await fetch(url, fetchOptions);
      } else {
        console.error("✗ Token refresh failed, redirecting to login...");
        // Refresh failed - clear storage and redirect to login
        localStorage.removeItem("user");
        window.location.href = "/";
        throw new Error("Session expired, please login again");
      }
    }

    return response;
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return apiFetch(endpoint, { method: "GET" });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(
  endpoint: string,
  body?: unknown
): Promise<Response> {
  return apiFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(
  endpoint: string,
  body?: unknown
): Promise<Response> {
  return apiFetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  return apiFetch(endpoint, { method: "DELETE" });
}
