import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "Employee",
    role: "Sales Person",
    branch: "",
    salary: "",
  });

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

  const fetchEmployee = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      const employee = response.data;

      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        designation: employee.designation || "Employee",
        role: employee.role || "Sales Person",
        branch: employee.branch || "",
        salary: employee.salary || "",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.designation || !formData.branch || !formData.salary) {
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
      const response = await api.put(`/employees/${id}`, formData);
      alert(response.data.message);
      navigate("/employees");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="content-container">
          <h1>Edit Employee</h1>
          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} />
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
              <select name="designation" value={formData.designation} onChange={handleChange}>
                <option value="Employee">Employee</option>
                <option value="Branch Manager">Branch Manager</option>
                <option value="Junior Manager">Junior Manager</option>
              </select>
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
              <label>Branch</label>
              <select name="branch" value={formData.branch} onChange={handleChange}>
                <option value="" disabled>
                  Select Branch
                </option>
                <option value="Main Branch">Main Branch</option>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Salary</label>
              <input type="number" name="salary" value={formData.salary} onChange={handleChange} />
            </div>

            <button type="submit" className="primary-btn">
              Update Employee
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default EditEmployee;
