import { useState, useEffect } from "react";

interface UserProfile {
  userId: string;
  name: string;
  role?: "user" | "admin";
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ userId: string; name: string } | null>(
    null
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    const storedUser = localStorage.getItem("user");
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Fetch user profile with role information
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setProfile(null);
        return;
      }

      try {
        const response = await fetch("http://localhost:3002/user/profile", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setProfile(userData);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchProfile();
  }, [token]);

  const login = (jwt: string, userData: { userId: string; name: string }) => {
    localStorage.setItem("jwt", jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const isLoggedIn = !!token;
  const isAdmin = profile?.role === "admin";

  return { token, user, login, logout, isLoggedIn, isAdmin, profile };
}
