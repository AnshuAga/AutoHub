import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";
import { API_BASE_URL } from "../../utils/api";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState("password");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loginOtpCooldown, setLoginOtpCooldown] = useState(() => {
    const savedExpiry = Number(localStorage.getItem("loginOtpCooldownUntil") || 0);
    return savedExpiry > Date.now() ? Math.ceil((savedExpiry - Date.now()) / 1000) : 0;
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });

  useEffect(() => {
    if (loginOtpCooldown <= 0) {
      localStorage.removeItem("loginOtpCooldownUntil");
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLoginOtpCooldown((currentCooldown) => Math.max(currentCooldown - 1, 0));
    }, 1000);

    localStorage.setItem("loginOtpCooldownUntil", String(Date.now() + loginOtpCooldown * 1000));

    return () => window.clearInterval(timer);
  }, [loginOtpCooldown]);

  useEffect(() => {
    const completeOAuthFromQuery = async () => {
      const token = searchParams.get("token") || searchParams.get("access_token") || searchParams.get("authToken");
      const userParam = searchParams.get("user");

      if (!token) {
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
        setStatus({ type: "error", message: "OAuth login failed. Please try again." });
      }
    };

    completeOAuthFromQuery();
  }, [navigate, searchParams]);

  const socialAuthUrls = {
    google: import.meta.env.VITE_GOOGLE_AUTH_URL || `${API_BASE_URL}/auth/google/start`,
    facebook: import.meta.env.VITE_FACEBOOK_AUTH_URL || `${API_BASE_URL}/auth/facebook/start`,
    microsoft: import.meta.env.VITE_MICROSOFT_AUTH_URL,
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authMode === "password" && (!formData.email || !formData.password)) {
      setStatus({ type: "error", message: "Please fill all fields" });
      return;
    }
    if (authMode === "otp" && (!formData.email || !formData.otp)) {
      setStatus({ type: "error", message: "Please enter email and OTP" });
      return;
    }

    try {
      const response =
        authMode === "password"
          ? await api.post("/auth/login", {
              email: formData.email,
              password: formData.password,
            })
          : await api.post("/auth/login-with-otp", {
              email: formData.email,
              otp: formData.otp,
            });

      setStatus({ type: "success", message: response.data.message });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/dashboard");

      console.log(response.data);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Login failed",
      });
    }
  };

  const handleSendLoginOtp = async () => {
    if (!formData.email) {
      setStatus({ type: "error", message: "Enter email first" });
      return;
    }

    if (loginOtpCooldown > 0) {
      setStatus({ type: "info", message: `Please wait ${loginOtpCooldown} seconds before requesting another OTP.` });
      return;
    }

    try {
      const response = await api.post("/auth/send-login-otp", {
        email: formData.email,
      });
      setLoginOtpCooldown(60);
      setStatus({ type: "success", message: `${response.data.message}. Please check your inbox.` });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to send login OTP",
      });
    }
  };

  const handleSocialSignIn = (provider) => {
    const url = socialAuthUrls[provider];

    if (!url) {
      setStatus({
        type: "info",
        message: `${provider} sign-in is not configured yet.`,
      });
      return;
    }

    window.location.href = url;
  };

  return (
    <div className="auth-layout">
      <Navbar />
      <div className="auth-page">
        <div className="auth-page-shell">
          <aside className="auth-side-visual card">
            <img src="/gallery/login.png" alt="AutoHub login" className="auth-side-image" />
          </aside>

          <section className="auth-card card">
            <div className="auth-intro">
              <span className="eyebrow">Welcome Back</span>
              <h1>Login to AutoHub</h1>
              <p>Login with your credentials. Access your showroom dashboard, inventory workflows, booking pipeline, and payments.</p>
            </div>

          <div className="auth-social-row">
            <button type="button" className="auth-social-btn auth-social-google" onClick={() => handleSocialSignIn("google")}>
              <img className="auth-social-icon" src="/auth-icons/google.svg" alt="Google" />
              <span>Continue with Google</span>
            </button>
            <button type="button" className="auth-social-btn auth-social-facebook" onClick={() => handleSocialSignIn("facebook")}>
              <img className="auth-social-icon" src="/auth-icons/facebook.svg" alt="Facebook" />
              <span>Continue with Facebook</span>
            </button>
            <button type="button" className="auth-social-btn auth-social-microsoft" onClick={() => handleSocialSignIn("microsoft")}>
              <img className="auth-social-icon" src="/auth-icons/microsoft.svg" alt="Microsoft" />
              <span>Continue with Microsoft</span>
            </button>
          </div>

          <div className="auth-divider">
            <span>or use your email</span>
          </div>

          <div className="auth-mode-switch">
            <button
              type="button"
              className={`auth-mode-btn ${authMode === "password" ? "active" : ""}`}
              onClick={() => setAuthMode("password")}
            >
              Password Login
            </button>
            <button
              type="button"
              className={`auth-mode-btn ${authMode === "otp" ? "active" : ""}`}
              onClick={() => setAuthMode("otp")}
            >
              OTP Login
            </button>
          </div>

          {status.message ? (
            <div className={`auth-status auth-status-${status.type || "info"}`}>
              {status.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="auth-form-grid">
            <div>
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {authMode === "password" ? (
              <div>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <div className="auth-inline-link-wrap">
                  <Link className="auth-inline-link" to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label>OTP</label>
                  <input
                    type="text"
                    name="otp"
                    placeholder="Enter 6-digit OTP"
                    value={formData.otp}
                    onChange={handleChange}
                  />
                </div>
                <button
                  type="button"
                  className="ghost-btn auth-otp-btn"
                  onClick={handleSendLoginOtp}
                  disabled={loginOtpCooldown > 0}
                >
                  {loginOtpCooldown > 0 ? `Resend OTP in ${loginOtpCooldown}s` : "Send OTP to Email"}
                </button>
              </>
            )}

            <button type="submit" className="primary-btn auth-submit-btn">
              {authMode === "password" ? "Login" : "Verify OTP & Login"}
            </button>
          </form>

            <p className="auth-footnote">
              New user? <Link to="/register">Create an account</Link>
            </p>
            <p className="auth-footnote" style={{ marginTop: "8px" }}>
              Team member? <Link to="/team-login">Team Login</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Login;