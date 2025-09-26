import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userId = params.get("userId");
    const name = params.get("name");

    if (token && userId && name) {
      login(token, { userId, name });
      navigate("/home", { replace: true });
    }
  }, [login, navigate]);

  return <div>Logging in...</div>;
}
