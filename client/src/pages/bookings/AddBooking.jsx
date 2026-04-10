import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

function AddBooking() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerRegistrationNo: "",
    vehicleName: "",
    vehicleType: "",
    branch: "Main Branch",
    bookingDate: "",
    status: "Pending",
    paymentStatus: "Unpaid",
    paymentMethod: "Debit Card",
    amount: "",
    cardLast4: "",
    transactionId: "",
  });

  useEffect(() => {
    if (currentUser?.role === "customer") {
      setFormData((previous) => ({
        ...previous,
        customerName: currentUser.name || previous.customerName,
        customerEmail: currentUser.email || previous.customerEmail,
        customerPhone: currentUser.phone || previous.customerPhone,
      }));
    }
  }, []);

  useEffect(() => {
    const selectedVehicle = localStorage.getItem("selectedVehicle");

    if (selectedVehicle) {
      try {
        const parsedVehicle = JSON.parse(selectedVehicle);

        setFormData((previous) => ({
          ...previous,
          vehicleName: parsedVehicle.vehicleName || previous.vehicleName,
          vehicleType: parsedVehicle.vehicleType || previous.vehicleType,
          branch: parsedVehicle.branch || previous.branch,
          amount: parsedVehicle.amount || previous.amount,
        }));
      } catch (error) {
        console.log(error);
      }
    }
  }, []);

  const handleChange = (e) => {
    const nextValue = e.target.name === "customerPhone" ? normalizePhoneInput(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: nextValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
        if (
        !formData.customerName ||
      !formData.vehicleName ||
      !formData.bookingDate
    ) {
      alert("Please fill all fields");
      return;
    }

        if (!isTenDigitPhoneNumber(formData.customerPhone)) {
          alert("Phone number must be exactly 10 digits");
          return;
        }

    if (formData.paymentMethod === "Debit Card" && formData.cardLast4 && formData.cardLast4.length !== 4) {
      alert("Enter the last 4 digits of the debit card");
      return;
    }

    try {
      const response = await api.post("/bookings", formData);

      alert(response.data.message);

      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        customerRegistrationNo: "",
        vehicleName: "",
        vehicleType: "",
        branch: "Main Branch",
        bookingDate: "",
        status: "Pending",
        paymentStatus: "Unpaid",
        paymentMethod: "Debit Card",
        amount: "",
        cardLast4: "",
        transactionId: "",
      });
      localStorage.removeItem("selectedVehicle");
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
          <h1>Add Booking</h1>

          <form onSubmit={handleSubmit} className="form-container">
            <div className="section-heading" style={{ marginBottom: "16px" }}>
              <span className="eyebrow">Customer Details</span>
              <p style={{ margin: 0 }}>Booking also creates or updates the customer profile.</p>
            </div>

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
              <label>Registration No</label>
              <input
                type="text"
                name="customerRegistrationNo"
                value={formData.customerRegistrationNo}
                onChange={handleChange}
              />
            </div>

            <div className="section-heading" style={{ margin: "24px 0 16px" }}>
              <span className="eyebrow">Vehicle & Booking</span>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Selected Vehicle</label>
              <input type="text" name="vehicleName" value={formData.vehicleName} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Booking Date</label>
              <input type="date" name="bookingDate" value={formData.bookingDate} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle Type</label>
              <input type="text" name="vehicleType" value={formData.vehicleType} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Payment Status</label>
              <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange}>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="section-heading" style={{ margin: "24px 0 16px" }}>
              <span className="eyebrow">Payment Details</span>
              <p style={{ margin: 0 }}>Payment details are stored from the booking form, so a separate payment form is not needed.</p>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Payment Method</label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Amount</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} />
            </div>

            {formData.paymentMethod === "Debit Card" && (
              <div style={{ marginBottom: "15px" }}>
                <label>Card Last 4 Digits</label>
                <input type="text" name="cardLast4" maxLength="4" value={formData.cardLast4} onChange={handleChange} />
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label>Transaction ID</label>
              <input type="text" name="transactionId" value={formData.transactionId} onChange={handleChange} />
            </div>

            <button type="submit" className="success-btn">
            Add Booking
          </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddBooking;
