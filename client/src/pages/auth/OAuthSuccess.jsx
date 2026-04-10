import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";

function OAuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Please wait while we complete your account setup.");

  useEffect(() => {
    const completeOAuthLogin = async () => {
      const token = searchParams.get("token") || searchParams.get("access_token") || searchParams.get("authToken");
      const userParam = searchParams.get("user");

      if (!token) {
        setMessage("OAuth login failed. Missing token.");
        window.setTimeout(() => navigate("/login"), 1200);
        return;
      }

      try {
        localStorage.setItem("token", token);

        if (userParam) {
          try {
            const parsedUser = JSON.parse(userParam);
            localStorage.setItem("user", JSON.stringify(parsedUser));
          } catch {
            const profileResponse = await api.get("/auth/profile");
            localStorage.setItem("user", JSON.stringify(profileResponse.data.user));
          }
        } else {
          const profileResponse = await api.get("/auth/profile");
          localStorage.setItem("user", JSON.stringify(profileResponse.data.user));
        }

        window.dispatchEvent(new Event("user-updated"));
        navigate("/dashboard", { replace: true });
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setMessage("OAuth login failed. Please try again.");
        window.setTimeout(() => navigate("/login"), 1200);
      }
    };

    completeOAuthLogin();
  }, [navigate, searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>Signing you in...</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}

export default OAuthSuccess;
