import { useState, useEffect } from "react";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ userId: string; name: string } | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    const storedUser = localStorage.getItem("user");
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

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
  };

  const isLoggedIn = !!token;

  return { token, user, login, logout, isLoggedIn };
}
