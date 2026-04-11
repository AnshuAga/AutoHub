import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../utils/api";
import { API_BASE_URL } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

function Register() {
  const navigate = useNavigate();
  const [otpSent, setOtpSent] = useState(false);
  const [registerOtpCooldown, setRegisterOtpCooldown] = useState(() => {
    const savedExpiry = Number(localStorage.getItem("registerOtpCooldownUntil") || 0);
    return savedExpiry > Date.now() ? Math.ceil((savedExpiry - Date.now()) / 1000) : 0;
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "customer",
    otp: "",
  });

  useEffect(() => {
    if (registerOtpCooldown <= 0) {
      localStorage.removeItem("registerOtpCooldownUntil");
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRegisterOtpCooldown((currentCooldown) => Math.max(currentCooldown - 1, 0));
    }, 1000);

    localStorage.setItem("registerOtpCooldownUntil", String(Date.now() + registerOtpCooldown * 1000));

    return () => window.clearInterval(timer);
  }, [registerOtpCooldown]);

  const socialAuthUrls = {
    google: import.meta.env.VITE_GOOGLE_AUTH_URL || `${API_BASE_URL}/auth/google/start`,
    facebook: import.meta.env.VITE_FACEBOOK_AUTH_URL || `${API_BASE_URL}/auth/facebook/start`,
    microsoft: import.meta.env.VITE_MICROSOFT_AUTH_URL,
  };

  const handleChange = (e) => {
    const nextValue = e.target.name === "phone" ? normalizePhoneInput(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: nextValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email)) {
      setStatus({ type: "error", message: "Please enter a valid email" });
      return;
    }
    if (formData.password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters" });
      return;
    }
    if (!isTenDigitPhoneNumber(formData.phone)) {
      setStatus({ type: "error", message: "Phone number must be exactly 10 digits" });
      return;
    }
    if (!formData.otp) {
      setStatus({ type: "error", message: "Please enter the OTP sent to your email" });
      return;
    }

    try {
      const response = await api.post("/auth/register", formData);

      setStatus({ type: "success", message: response.data.message });
      navigate("/login");

      console.log(response.data);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Registration failed",
      });
    }
  };

  const handleSendRegisterOtp = async () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email || !emailPattern.test(formData.email)) {
      setStatus({ type: "error", message: "Enter a valid email first" });
      return;
    }

    if (registerOtpCooldown > 0) {
      setStatus({ type: "info", message: `Please wait ${registerOtpCooldown} seconds before requesting another OTP.` });
      return;
    }

    try {
      const response = await api.post("/auth/send-register-otp", {
        email: formData.email,
        name: formData.name,
      });
      setOtpSent(true);
      setRegisterOtpCooldown(60);
      setStatus({ type: "success", message: `${response.data.message}. Please check your inbox.` });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to send OTP",
      });
    }
  };

  const handleSocialSignIn = (provider) => {
    const url = socialAuthUrls[provider];

    if (!url) {
      setStatus({
        type: "info",
        message: `${provider} sign-up is not configured yet.`,
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
            <img src="/gallery/register.png" alt="AutoHub register" className="auth-side-image" />
          </aside>

          <section className="auth-card card">
            <div className="auth-intro">
              <span className="eyebrow">Get Started</span>
              <h1>Create Your AutoHub Account</h1>
              <p>Register once, then login with your credentials to manage inventory, bookings, payments, and customer journeys in one place.</p>
            </div>

          <div className="auth-social-row">
            <button type="button" className="auth-social-btn auth-social-google" onClick={() => handleSocialSignIn("google")}>
              <img className="auth-social-icon" src="/auth-icons/google.svg" alt="Google" />
              <span>Sign up with Google</span>
            </button>
            <button type="button" className="auth-social-btn auth-social-facebook" onClick={() => handleSocialSignIn("facebook")}>
              <img className="auth-social-icon" src="/auth-icons/facebook.svg" alt="Facebook" />
              <span>Sign up with Facebook</span>
            </button>
            <button type="button" className="auth-social-btn auth-social-microsoft" onClick={() => handleSocialSignIn("microsoft")}>
              <img className="auth-social-icon" src="/auth-icons/microsoft.svg" alt="Microsoft" />
              <span>Sign up with Microsoft</span>
            </button>
          </div>

          <div className="auth-divider">
            <span>or register with email</span>
          </div>

          {status.message ? (
            <div className={`auth-status auth-status-${status.type || "info"}`}>
              {status.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="auth-form-grid">
            <div>
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

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

            <button
              type="button"
              className="ghost-btn auth-otp-btn"
              onClick={handleSendRegisterOtp}
              disabled={registerOtpCooldown > 0}
            >
              {registerOtpCooldown > 0
                ? `Resend OTP in ${registerOtpCooldown}s`
                : otpSent
                ? "Resend OTP"
                : "Send OTP to Email"}
            </button>

            <div>
              <label>Email OTP</label>
              <input
                type="text"
                name="otp"
                placeholder="Enter 6-digit OTP"
                value={formData.otp}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                title="Enter a 10-digit phone number"
              />
            </div>

            <button type="submit" className="success-btn auth-submit-btn">
              Register
            </button>
          </form>

            <p className="auth-footnote">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Register;