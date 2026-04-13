import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import { api } from "../../utils/api";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setStatus({ type: "error", message: "Reset token is missing. Please request a new link." });
      return;
    }

    if (!formData.password || !formData.confirmPassword) {
      setStatus({ type: "error", message: "Please fill all fields" });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post("/auth/reset-password", {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setStatus({ type: "success", message: response.data.message });
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to reset password",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <Navbar />
      <div className="auth-page">
        <section className="auth-card card">
          <div className="auth-intro">
            <span className="eyebrow">Secure Reset</span>
            <h1>Reset Password</h1>
            <p>Set a new password for your AutoHub account.</p>
          </div>

          {!token ? (
            <div className="auth-status auth-status-error">
              Invalid or missing reset token. Please request a new reset link.
            </div>
          ) : null}

          {status.message ? (
            <div className={`auth-status auth-status-${status.type || "info"}`}>
              {status.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="auth-form-grid">
            <div>
              <label>New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleChange}
              />
              <div className="auth-inline-link-wrap">
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide password" : "View password"}
                </button>
              </div>
            </div>

            <div>
              <label>Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <div className="auth-inline-link-wrap">
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? "Hide password" : "View password"}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn auth-submit-btn" disabled={isSubmitting || !token}>
              {isSubmitting ? "Updating password..." : "Reset Password"}
            </button>
          </form>

          <p className="auth-footnote">
            Remembered your password? <Link to="/login">Go to login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default ResetPassword;
