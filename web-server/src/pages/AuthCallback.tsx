import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startTokenRefreshTimer } from "../utils/tokenRefresh";
import config from "../config/environment";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we have URL parameters from the backend
        const params = new URLSearchParams(window.location.search);
        const userId = params.get("userId");
        const name = params.get("name");

        console.log("AuthCallback - URL params:", { userId, name });

        if (userId && name) {
          // Store user data in localStorage
          localStorage.setItem("user", JSON.stringify({ userId, name }));
          console.log("User data stored in localStorage");

          // Start token refresh timer
          startTokenRefreshTimer();

          // Navigate to home
          navigate("/home", { replace: true });
        } else {
          // No params - try to fetch user profile directly using the cookie
          console.log("No URL params, fetching profile...");

          const response = await fetch(config.auth.profile, {
            credentials: "include",
          });

          if (response.ok) {
            const userData = await response.json();
            console.log("Fetched user profile:", userData);
            localStorage.setItem("user", JSON.stringify(userData));

            // Start token refresh timer
            startTokenRefreshTimer();

            navigate("/home", { replace: true });
          } else {
            console.error("Failed to fetch profile:", response.status);
            setError("Login failed. Redirecting...");
            setTimeout(() => navigate("/", { replace: true }), 2000);
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Login failed. Redirecting...");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.2rem",
      }}
    >
      {error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <div>Logging in...</div>
      )}
    </div>
  );
}
