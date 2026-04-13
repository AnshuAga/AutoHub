import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/navbar";
import { api } from "../../utils/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email) {
      setStatus({ type: "error", message: "Please enter your email" });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post("/auth/forgot-password", { email });
      setStatus({ type: "success", message: response.data.message });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to process your request",
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
            <span className="eyebrow">Account Recovery</span>
            <h1>Forgot Password</h1>
            <p>Enter your account email and we will send a secure password reset link.</p>
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
                placeholder="Enter your account email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <button type="submit" className="primary-btn auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Sending reset link..." : "Send Reset Link"}
            </button>
          </form>

          <p className="auth-footnote">
            Back to <Link to="/login">Customer Login</Link>
          </p>
          <p className="auth-footnote" style={{ marginTop: "8px" }}>
            Team member? <Link to="/team-login">Team Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default ForgotPassword;
