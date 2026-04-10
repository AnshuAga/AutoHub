import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    paymentMethod: "Debit Card",
  });

  const handleChange = (e) => {
    const nextValue = e.target.name === "customerPhone" ? normalizePhoneInput(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: nextValue,
    });
  };

  const fetchBooking = async () => {
    try {
      const response = await api.get(`/bookings/${id}`);
      const booking = response.data;
      setFormData({
        customerName: booking.customerName || "",
        customerEmail: booking.customerEmail || "",
        customerPhone: booking.customerPhone || "",
        customerAddress: booking.customerAddress || "",
        paymentMethod: booking.paymentMethod || "Debit Card",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isTenDigitPhoneNumber(formData.customerPhone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    try {
      const response = await api.put(`/bookings/${id}`, formData);
      alert(response.data.message);
      navigate("/bookings");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, []);

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Edit Booking</h1>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Customer Name</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Email</label>
              <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Phone</label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                title="Enter a 10-digit phone number"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Address</label>
              <textarea name="customerAddress" value={formData.customerAddress} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Payment Method</label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <button type="submit" className="primary-btn">
              Update Booking
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default EditBooking;
