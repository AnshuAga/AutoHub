import { useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

function AddCustomer() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    branch: "Main Branch",
    address: "",
  });

  const handleChange = (e) => {
    const nextValue = e.target.name === "phone" ? normalizePhoneInput(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: nextValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
        alert("Please fill all fields");
        return;
      }

    if (!isTenDigitPhoneNumber(formData.phone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    try {
      const response = await api.post("/customers", formData);

      alert(response.data.message);

      setFormData({
        name: "",
        email: "",
        phone: "",
        branch: "Main Branch",
        address: "",
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Add Customer</h1>

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
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                title="Enter a 10-digit phone number"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Registration No</label>
              <input type="text" value="Auto-generated on save" disabled />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} />
            </div>

            <button type="submit" className="success-btn">
              Add Customer
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddCustomer;
