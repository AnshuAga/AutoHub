import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

const formatJoinDate = (createdAt) => {
  if (!createdAt) {
    return "-";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function Profile() {
  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/profile.png")',
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

  const [user, setUser] = useState(getStoredUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [previewImage, setPreviewImage] = useState(getStoredUser().profileImage || "");
  const [formData, setFormData] = useState({
    name: getStoredUser().name || "",
    email: getStoredUser().email || "",
    phone: getStoredUser().phone || "",
  });

  useEffect(() => {
    const syncUser = () => {
      const latestUser = getStoredUser();
      setUser(latestUser);
      setPreviewImage(latestUser.profileImage || "");
      setFormData({
        name: latestUser.name || "",
        email: latestUser.email || "",
        phone: latestUser.phone || "",
      });
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      try {
        const response = await api.get("/auth/profile");
        const serverUser = response.data?.user;

        if (!serverUser) {
          return;
        }

        saveUserToStorage(serverUser);
        setPreviewImage(serverUser.profileImage || "");
        setFormData({
          name: serverUser.name || "",
          email: serverUser.email || "",
          phone: serverUser.phone || "",
        });
      } catch (error) {
        console.log(error);
      }
    };

    fetchProfile();
  }, []);

  const saveUserToStorage = (updatedUser, successMessage) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("user-updated"));
    if (successMessage) {
      setStatus({ type: "success", message: successMessage });
    }
  };

  const handleEditClick = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setStatus({ type: "", message: "" });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setPreviewImage(user?.profileImage || "");
    setStatus({ type: "", message: "" });
    setIsEditing(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === "phone" ? normalizePhoneInput(value) : value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setStatus({ type: "error", message: "Name and email are required." });
      return;
    }

    if (!isTenDigitPhoneNumber(formData.phone)) {
      setStatus({ type: "error", message: "Phone number must be exactly 10 digits." });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await api.put("/auth/profile", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        profileImage: previewImage,
      });

      const updatedUser = response.data?.user;

      if (updatedUser) {
        saveUserToStorage(updatedUser, "Profile updated successfully.");
      }

      setIsEditing(false);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: "error", message: "Please upload an image smaller than 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result;
      setPreviewImage(imageData);

      if (isEditing) {
        setStatus({ type: "info", message: "Photo selected. Click Save Changes to persist." });
        return;
      }

      setIsSaving(true);
      try {
        const response = await api.put("/auth/profile", {
          name: (user?.name || "").trim(),
          email: (user?.email || "").trim(),
          phone: (user?.phone || "").trim(),
          profileImage: imageData,
        });

        const updatedUser = response.data?.user;
        if (updatedUser) {
          saveUserToStorage(updatedUser, "Profile photo updated.");
        }
      } catch (error) {
        setStatus({
          type: "error",
          message: error.response?.data?.message || "Unable to save profile photo.",
        });
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <div className="profile-header">
            <div>
              <span className="eyebrow">Account Center</span>
              <h1 style={{ marginTop: "12px" }}>My Profile</h1>
              <p style={{ color: "#000000" }}>Update your personal details and profile photo from one place.</p>
            </div>

            {!isEditing ? (
              <button type="button" className="primary-btn" onClick={handleEditClick}>
                Edit Profile
              </button>
            ) : null}
          </div>

          {status.message ? (
            <div className={`auth-status auth-status-${status.type || "info"}`}>{status.message}</div>
          ) : null}

          <div className="profile-grid">
            <section className="card profile-summary-card">
              <div className="profile-avatar-wrapper">
                {previewImage ? (
                  <img src={previewImage} alt="Profile" className="profile-avatar-image" />
                ) : (
                  <span>{(user?.name || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>

              <h2 style={{ margin: "0 0 6px" }}>{user?.name || "User"}</h2>
              <p style={{ margin: 0 }}>{(user?.role || "customer").toUpperCase()}</p>

              <div className="profile-photo-control">
                <label htmlFor="profile-image">Profile Image</label>
                <input id="profile-image" type="file" accept="image/*" onChange={handleImageChange} />
              </div>
            </section>

            <section className="card">
              <form className="profile-form-grid" onSubmit={handleSaveProfile}>
                <div>
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Add your phone number"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="\d{10}"
                    title="Enter a 10-digit phone number"
                  />
                </div>

                <div>
                  <label>Role</label>
                  <input type="text" value={user?.role || "customer"} disabled />
                </div>

                <div>
                  <label>Status</label>
                  <input type="text" value="Active" disabled />
                </div>

                <div>
                  <label>Member Since</label>
                  <input type="text" value={formatJoinDate(user?.createdAt)} disabled />
                </div>

                {isEditing ? (
                  <div className="profile-action-row">
                    <button type="submit" className="success-btn" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button type="button" className="ghost-btn" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </button>
                  </div>
                ) : null}
              </form>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Profile;