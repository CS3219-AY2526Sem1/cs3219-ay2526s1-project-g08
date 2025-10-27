import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import {
  startTokenRefreshTimer,
  stopTokenRefreshTimer,
} from "../utils/tokenRefresh";

interface UserProfile {
  userId: string;
  name: string;
  role?: "user" | "admin";
}

export function useAuth() {
  const [user, setUser] = useState<{ userId: string; name: string } | null>(
    null
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in by checking localStorage and fetching profile
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));

        // Fetch profile to get role information and verify session
        try {
          const response = await apiFetch("/user/profile");

          if (response.ok) {
            const userData = await response.json();
            setProfile(userData);
            // Update localStorage with latest profile data
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);

            // Start token refresh timer
            startTokenRefreshTimer();

            // Fetch token for use with other services
            try {
              const tokenResponse = await fetch("http://localhost:3002/user/token", {
                credentials: "include",
              });
              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                setToken(tokenData.token);
              }
            } catch (err) {
              console.error("Error fetching token:", err);
            }
          } else {
            // Session expired or invalid - clear localStorage
            localStorage.removeItem("user");
            setUser(null);
            setProfile(null);
            setToken(null);
            stopTokenRefreshTimer();
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          // Don't clear user on network error, but clear profile
          setProfile(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (userData: { userId: string; name: string }) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    // Start token refresh timer when user logs in
    startTokenRefreshTimer();
  };

  const logout = () => {
    // Stop token refresh timer
    stopTokenRefreshTimer();

    localStorage.removeItem("user");
    setUser(null);
    setProfile(null);
    setToken(null);
  };

  // Function to get token on demand (useful for API calls)
  const getToken = async (): Promise<string | null> => {
    if (token) {
      return token;
    }

    try {
      const response = await fetch("http://localhost:3002/user/token", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        return data.token;
      }
    } catch (err) {
      console.error("Error fetching token:", err);
    }
    
    return null;
  };

  // User is logged in if we have user data in localStorage
  const isLoggedIn = !!user;
  const isAdmin = profile?.role === "admin";

  return { user, login, logout, isLoggedIn, isAdmin, profile, isLoading, token, getToken };
}
