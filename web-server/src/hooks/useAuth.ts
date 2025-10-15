import { useState, useEffect } from "react";

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
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in by checking localStorage and fetching profile
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));

        // Fetch profile to get role information and verify session
        try {
          const response = await fetch("http://localhost:3002/user/profile", {
            credentials: "include",
          });

          if (response.ok) {
            const userData = await response.json();
            setProfile(userData);
            // Update localStorage with latest profile data
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
          } else {
            // Session expired or invalid - clear localStorage
            localStorage.removeItem("user");
            setUser(null);
            setProfile(null);
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
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setProfile(null);
  };

  // User is logged in if we have user data in localStorage
  const isLoggedIn = !!user;
  const isAdmin = profile?.role === "admin";

  return { user, login, logout, isLoggedIn, isAdmin, profile, isLoading };
}
