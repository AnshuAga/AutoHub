import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import { api } from "../../utils/api";

const TEAM_ROLES = ["admin", "manager", "employee"];

function EmployeeLogin() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("password");
  const [teamOtpCooldown, setTeamOtpCooldown] = useState(() => {
    const savedExpiry = Number(localStorage.getItem("teamLoginOtpCooldownUntil") || 0);
    return savedExpiry > Date.now() ? Math.ceil((savedExpiry - Date.now()) / 1000) : 0;
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });

  useEffect(() => {
    if (teamOtpCooldown <= 0) {
      localStorage.removeItem("teamLoginOtpCooldownUntil");
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTeamOtpCooldown((currentCooldown) => Math.max(currentCooldown - 1, 0));
    }, 1000);

    localStorage.setItem("teamLoginOtpCooldownUntil", String(Date.now() + teamOtpCooldown * 1000));

    return () => window.clearInterval(timer);
  }, [teamOtpCooldown]);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (authMode === "password" && (!formData.email || !formData.password)) {
      setStatus({ type: "error", message: "Please enter email and password" });
      return;
    }

    if (authMode === "otp" && (!formData.email || !formData.otp)) {
      setStatus({ type: "error", message: "Please enter email and OTP" });
      return;
    }

    try {
      const response =
        authMode === "password"
          ? await api.post("/auth/team/login", {
              email: formData.email,
              password: formData.password,
            })
          : await api.post("/auth/team/login-with-otp", {
              email: formData.email,
              otp: formData.otp,
            });

      const user = response.data?.user;
      if (!user || !TEAM_ROLES.includes(String(user.role || "").toLowerCase())) {
        setStatus({
          type: "error",
          message: "This page is only for admin, branch manager, and employee accounts.",
        });
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      setStatus({ type: "success", message: response.data.message || "Login successful" });
      navigate("/dashboard");
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Employee login failed",
      });
    }
  };

  const handleSendTeamOtp = async () => {
    if (!formData.email) {
      setStatus({ type: "error", message: "Enter email first" });
      return;
    }

    if (teamOtpCooldown > 0) {
      setStatus({ type: "info", message: `Please wait ${teamOtpCooldown} seconds before requesting another OTP.` });
      return;
    }

    try {
      const response = await api.post("/auth/team/send-login-otp", {
        email: formData.email,
      });
      setTeamOtpCooldown(60);
      setStatus({ type: "success", message: `${response.data.message}. Please check your inbox.` });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to send OTP",
      });
    }
  };

  return (
    <div className="auth-layout">
      <Navbar />
      <div className="auth-page">
        <section className="auth-card card">
          <div className="auth-intro">
            <span className="eyebrow">Team Access</span>
            <h1>Team Login</h1>
            <p>Login with your credentials. Team access is available for Admin, Branch Manager, and Employee accounts.</p>
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
                placeholder="Enter employee email"
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
                  placeholder="Enter employee password"
                  value={formData.password}
                  onChange={handleChange}
                />
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
                  onClick={handleSendTeamOtp}
                  disabled={teamOtpCooldown > 0}
                >
                  {teamOtpCooldown > 0 ? `Resend OTP in ${teamOtpCooldown}s` : "Send OTP to Email"}
                </button>
              </>
            )}

            <button type="submit" className="primary-btn auth-submit-btn auth-submit-btn-team">
              {authMode === "password" ? "Login to Team Portal" : "Verify OTP & Login"}
            </button>
          </form>

          <p className="auth-footnote">
            Customer login? <Link to="/login">Go to main login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default EmployeeLogin;
