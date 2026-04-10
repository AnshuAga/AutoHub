import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    registrationNo: "",
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

  const fetchCustomer = async () => {
    try {
      const response = await api.get(`/customers/${id}`);
      setFormData({
        name: response.data.name || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        registrationNo: response.data.registrationNo || "",
        branch: response.data.branch || "Main Branch",
        address: response.data.address || "",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isTenDigitPhoneNumber(formData.phone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    try {
      const response = await api.put(`/customers/${id}`, formData);
      alert(response.data.message);
      navigate("/customers");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <Sidebar />
        <div className="content-container">
          <h1>Edit Customer</h1>
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
              <input type="text" name="registrationNo" value={formData.registrationNo} disabled />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} />
            </div>

            <button type="submit" className="primary-btn">
              Update Customer
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default EditCustomer;
