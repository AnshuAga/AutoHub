import { useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function AddEmployee() {
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const loggedInRole = String(loggedInUser?.role || "").toLowerCase();
  const loggedInDesignation = String(loggedInUser?.designation || loggedInUser?.employeeRole || "").toLowerCase();
  const isManager =
    loggedInRole === "manager" ||
    loggedInDesignation === "branch manager" ||
    loggedInDesignation === "junior manager";
  const managerBranch = String(loggedInUser?.branch || "");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: isManager ? "Employee" : "Employee",
    role: "Sales Person",
    branch: isManager ? managerBranch : "",
    salary: "",
    employeeImage: "",
  });
  const [imagePreview, setImagePreview] = useState("");

  const handleChange = (e) => {
    if (e.target.name === "designation") {
      const nextDesignation = e.target.value;
      setFormData({
        ...formData,
        designation: nextDesignation,
        role: nextDesignation === "Branch Manager" || nextDesignation === "Junior Manager" ? "" : formData.role || "Sales Person",
      });
      return;
    }

    if (e.target.name === "phone") {
      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
      setFormData({
        ...formData,
        phone: digitsOnly,
      });
      return;
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isManager && !managerBranch) {
      alert("Your account is missing branch mapping. Contact admin.");
      return;
    }

    if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.designation ||
        !formData.branch ||
        !formData.salary
        ) {
        alert("Please fill all fields");
        return;
        }

    if (formData.designation !== "Branch Manager" && formData.designation !== "Junior Manager" && !formData.role) {
      alert("Please fill all fields");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    try {
      const designationFromRole = formData.designation;
      const payload = {
        ...formData,
        designation: designationFromRole,
          role: formData.role,
        branch: isManager ? managerBranch : formData.branch,
      };

      const response = await api.post("/employees", payload);
      alert(response.data.message);

      setFormData({
        name: "",
        email: "",
        phone: "",
        designation: "Employee",
        role: "Sales Person",
        branch: isManager ? managerBranch : "",
        salary: "",
        employeeImage: "",
      });
      setImagePreview("");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add employee");
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      setImagePreview(imageData);
      setFormData((current) => ({
        ...current,
        employeeImage: imageData,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Add Employee</h1>
          <div
            className="card"
            style={{
              marginBottom: "16px",
              border: "1px solid rgba(15, 76, 129, 0.3)",
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(15, 76, 129, 0.08))",
            }}
          >
            <p style={{ margin: 0, color: "#0f4c81", fontWeight: 600 }}>
              Login credentials are sent automatically via SMTP email after successful employee creation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Employee Photo</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>

            {imagePreview ? (
              <div style={{ marginBottom: "15px" }}>
                <img
                  src={imagePreview}
                  alt="Employee preview"
                  style={{ width: "140px", height: "140px", borderRadius: "16px", objectFit: "cover" }}
                />
              </div>
            ) : null}

            <div style={{ marginBottom: "15px" }}>
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]{10}"
                placeholder="10-digit phone number"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Designation</label>
              {isManager ? (
                <select name="designation" value={formData.designation} onChange={handleChange}>
                  <option value="Employee">Employee</option>
                  <option value="Junior Manager">Junior Manager</option>
                </select>
              ) : (
                <select name="designation" value={formData.designation} onChange={handleChange}>
                  <option value="Employee">Employee</option>
                  <option value="Branch Manager">Branch Manager</option>
                  <option value="Junior Manager">Junior Manager</option>
                </select>
              )}
            </div>

            {formData.designation !== "Branch Manager" && formData.designation !== "Junior Manager" ? (
              <div style={{ marginBottom: "15px" }}>
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="Sales Person">Sales Person</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Delivery Man">Delivery Man</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            ) : null}

            <div style={{ marginBottom: "15px" }}>
              <label>Salary</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              {isManager ? (
                <input type="text" value={managerBranch || "Branch not assigned"} disabled />
              ) : (
                <select name="branch" value={formData.branch} onChange={handleChange}>
                  <option value="" disabled>
                    Select Branch
                  </option>
                  <option value="Main Branch">Main Branch</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                </select>
              )}
            </div>

            <button type="submit" className="success-btn">
              Add Employee
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddEmployee;