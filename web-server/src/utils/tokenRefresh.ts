/**
 * Token Refresh Utility
 *
 * Manages automatic refresh of access tokens before they expire.
 * Access tokens expire after 1 hour, so we refresh them every 50 minutes.
 */

let refreshTimer: number | null = null;
let isRefreshing = false;

/**
 * Refresh the access token using the refresh token cookie
 * Returns true if successful, false otherwise
 */
export async function refreshAccessToken(): Promise<boolean> {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    console.log("⏳ Token refresh already in progress...");
    return false;
  }

  isRefreshing = true;

  try {
    console.log("🔄 Refreshing access token...");

    const response = await fetch("http://localhost:3002/auth/refresh", {
      method: "POST",
      credentials: "include", // Important: sends refresh token cookie
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✓ Access token refreshed successfully");

      // Update user data in localStorage if role changed
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.role = data.role;
        localStorage.setItem("user", JSON.stringify(user));
      }

      return true;
    }

    console.log("✗ Failed to refresh token:", response.status);
    return false;
  } catch (error) {
    console.error("✗ Token refresh error:", error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Start the automatic token refresh timer
 * Refreshes the token every 50 minutes (access token expires in 60 minutes)
 */
export function startTokenRefreshTimer(): void {
  // Don't restart if already running
  if (refreshTimer) {
    return;
  }

  // Refresh every 50 minutes (access token expires in 60 minutes)
  const REFRESH_INTERVAL = 50 * 60 * 1000;

  console.log("⏰ Starting auto-refresh timer (every 50 minutes)");

  refreshTimer = setInterval(async () => {
    console.log("⏰ Auto-refresh timer triggered");

    const success = await refreshAccessToken();

    if (!success) {
      console.error("⚠️ Auto-refresh failed - user may need to re-login");
      stopTokenRefreshTimer();

      // Clear user data and redirect to login
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  }, REFRESH_INTERVAL);

  // Also do an immediate refresh on startup to ensure token is fresh
  setTimeout(async () => {
    await refreshAccessToken();
  }, 1000); // Wait 1 second to let app initialize
}

/**
 * Stop the automatic token refresh timer
 */
export function stopTokenRefreshTimer(): void {
  if (refreshTimer) {
    console.log("⏸️ Stopping auto-refresh timer");
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Check if the refresh timer is currently running
 */
export function isRefreshTimerActive(): boolean {
  return refreshTimer !== null;
}
