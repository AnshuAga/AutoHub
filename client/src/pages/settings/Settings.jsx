import { useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function Settings() {
  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/setting.png")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "scroll",
  };

  const contentOverlayStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    margin: "20px",
    borderRadius: "16px",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
  };

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: "", message: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChangeInput = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordStatus({ type: "error", message: "Please fill all password fields." });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "New password must be at least 6 characters." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: "error", message: "New password and confirm password do not match." });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus({ type: "", message: "" });

    try {
      const response = await api.put("/auth/change-password", passwordForm);
      setPasswordStatus({ type: "success", message: response.data?.message || "Password changed successfully" });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to change password.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Settings</h1>

          <div className="card" style={{ maxWidth: "500px", marginTop: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ marginRight: "10px" }}>Dark Mode</label>

              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
                style={{ width: "auto" }}
              />
            </div>

            <div>
              <label style={{ marginRight: "10px" }}>Notifications</label>

              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
                style={{ width: "auto" }}
              />
            </div>
            <div style={{ marginTop: "20px" }}>
          <label style={{ marginRight: "10px" }}>Language</label>

          <select style={{ width: "100%", marginTop: "10px" }}>
            <option>English</option>
            <option>Hindi</option>
          </select>
        </div>
          </div>
          <div className="card" style={{ maxWidth: "500px", marginTop: "20px" }}>
            <h3 style={{ marginTop: 0 }}>Change Password</h3>

            {passwordStatus.message ? (
              <div className={`auth-status auth-status-${passwordStatus.type || "info"}`}>
                {passwordStatus.message}
              </div>
            ) : null}

            <form onSubmit={handleChangePassword} className="profile-form-grid">
              <div>
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChangeInput}
                />
              </div>

              <div>
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChangeInput}
                />
              </div>

              <div>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChangeInput}
                />
              </div>

              <div style={{ marginTop: "8px" }}>
                <button type="submit" className="primary-btn" disabled={isChangingPassword}>
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
          <div style={{ marginTop: "20px" }}>
          <button className="primary-btn">
            Save Settings
          </button>
        </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Settings;