import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { startRazorpayCheckout } from "../../utils/razorpay";

function AddPayment() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    bookingId: "",
    bookingNo: "",
    customerName: "",
    customerEmail: "",
    vehicleName: "",
    amount: "",
    branch: "Main Branch",
    upiId: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    cardHolderName: "",
  });

  useEffect(() => {
    const bookingPayload = localStorage.getItem("selectedPaymentBooking");

    if (!bookingPayload) {
      return;
    }

    try {
      const parsedBooking = JSON.parse(bookingPayload);
      setFormData((previous) => ({
        ...previous,
        bookingId: parsedBooking.bookingId || "",
        bookingNo: parsedBooking.bookingNo || "",
        customerName: parsedBooking.customerName || previous.customerName,
        customerEmail: parsedBooking.customerEmail || previous.customerEmail,
        amount: parsedBooking.amount || previous.amount,
        vehicleName: parsedBooking.vehicleName || previous.vehicleName,
        branch: parsedBooking.branch || previous.branch,
      }));
    } catch (error) {
      console.log(error);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName || !formData.amount) {
      alert("Please fill the customer name and amount");
      return;
    }

    try {
      setProcessing(true);
      const response = await startRazorpayCheckout({
        endpointBase: "/payments",
        amount: Number(formData.amount),
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        bookingId: formData.bookingId || undefined,
        bookingNo: formData.bookingNo || "",
        branch: formData.branch || "Main Branch",
        method: selectedMethod,
        paymentType: "booking",
        customerPhone: "",
        description: "AutoHub vehicle booking payment",
      });

      alert(`${response.message || "Payment completed"}. Transaction ID: ${response.payment?.transactionId || ""}`);

      localStorage.setItem("autohub:payments-updated", String(Date.now()));
      window.dispatchEvent(new Event("autohub:payments-updated"));

      setFormData({
        bookingId: "",
        bookingNo: "",
        customerName: "",
        customerEmail: "",
        vehicleName: "",
        amount: "",
        branch: "Main Branch",
        upiId: "",
        cardNumber: "",
        cardExpiry: "",
        cardCvv: "",
        cardHolderName: "",
      });
      setSelectedMethod("UPI");
      localStorage.removeItem("selectedPaymentBooking");
      navigate("/deliveries");
    } catch (error) {
      alert(error.response?.data?.message || error.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const amountValue = Number(formData.amount || 0);
  const summaryLabel = formData.bookingNo || formData.bookingId || "Secure checkout";

  const pageStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(5, 14, 24, 0.28), rgba(5, 14, 24, 0.48)), url("/gallery/payment.png")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "scroll",
  };

  const overlayStyle = {
    background:
      "linear-gradient(180deg, rgba(6, 17, 32, 0.62) 0%, rgba(6, 17, 32, 0.46) 100%)",
    minHeight: "calc(100vh - 120px)",
    paddingBottom: "32px",
  };

  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: "24px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.24)",
    border: "1px solid rgba(255, 255, 255, 0.5)",
  };

  const fieldStyle = {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(15, 23, 42, 0.14)",
    padding: "13px 14px",
    fontSize: "15px",
    backgroundColor: "#fff",
    color: "#0f172a",
    boxSizing: "border-box",
  };

  const methodButtonStyle = (isActive) => ({
    flex: 1,
    minWidth: "180px",
    padding: "16px",
    borderRadius: "18px",
    border: isActive ? "1px solid #0f766e" : "1px solid rgba(15, 23, 42, 0.12)",
    background: isActive
      ? "linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(14, 165, 233, 0.14))"
      : "#fff",
    color: "#0f172a",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: isActive ? "0 16px 28px rgba(14, 165, 233, 0.16)" : "none",
  });

  return (
    <div style={pageStyle}>
      <Navbar />

      <div className="page-container" style={overlayStyle}>
        <Sidebar />

        <div className="content-container" style={{ paddingTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", flexWrap: "wrap", marginBottom: "24px" }}>
            <div>
              <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.16em", color: "#94a3b8", fontSize: "12px" }}>
                Razorpay-style checkout
              </p>
              <h1 style={{ margin: "8px 0 6px", color: "#f8fafc" }}>Secure payment gateway</h1>
              <p style={{ margin: 0, color: "#dbeafe" }}>
                Complete the payment and the booking will move into delivery automatically.
              </p>
            </div>
            <div style={{ ...cardStyle, padding: "16px 20px", minWidth: "240px" }}>
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b" }}>
                Payment summary
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginTop: "6px" }}>
                {amountValue ? `₹${amountValue.toLocaleString("en-IN")}` : "₹0"}
              </div>
              <div style={{ color: "#475569", marginTop: "4px" }}>{summaryLabel}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "24px", alignItems: "start" }}>
            <form onSubmit={handleSubmit} style={{ ...cardStyle, padding: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", marginBottom: "18px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Customer Name</label>
                  <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Amount</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleChange} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Customer Email</label>
                  <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Branch</label>
                  <input type="text" name="branch" value={formData.branch} onChange={handleChange} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Booking No</label>
                  <input type="text" value={formData.bookingNo || "Auto-linked from booking"} disabled style={{ ...fieldStyle, backgroundColor: "#f8fafc", color: "#475569" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Vehicle</label>
                  <input type="text" value={formData.vehicleName || "Auto-linked vehicle"} disabled style={{ ...fieldStyle, backgroundColor: "#f8fafc", color: "#475569" }} />
                </div>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => handleMethodSelect("UPI")} style={methodButtonStyle(selectedMethod === "UPI")}> 
                    <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>UPI</div>
                    <div style={{ fontSize: "13px", color: "#475569" }}>Razorpay opens UPI, card, and net banking options securely.</div>
                  </button>
                  <button type="button" onClick={() => handleMethodSelect("Credit Card")} style={methodButtonStyle(selectedMethod === "Credit Card")}> 
                    <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>Credit Card</div>
                    <div style={{ fontSize: "13px", color: "#475569" }}>Secure payment is handled by the Razorpay checkout.</div>
                  </button>
                </div>
              </div>

              {selectedMethod === "UPI" ? (
                <div style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>UPI ID</label>
                    <input type="text" name="upiId" value={formData.upiId} onChange={handleChange} placeholder="name@bank" style={fieldStyle} />
                  </div>
                  <div style={{ borderRadius: "18px", border: "1px dashed rgba(15, 23, 42, 0.18)", padding: "18px", background: "linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(15, 118, 110, 0.08))" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Popular UPI apps</div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {[
                        "Google Pay",
                        "PhonePe",
                        "Paytm",
                        "BHIM",
                      ].map((app) => (
                        <span key={app} style={{ padding: "8px 12px", borderRadius: "999px", backgroundColor: "#fff", color: "#0f172a", border: "1px solid rgba(15, 23, 42, 0.1)", fontSize: "13px", fontWeight: 600 }}>
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderRadius: "16px", padding: "14px 16px", backgroundColor: "#ecfeff", color: "#155e75", border: "1px solid rgba(8, 145, 178, 0.16)" }}>
                    Razorpay handles the secure payment step. UPI, card, and other methods stay inside the gateway.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Card Holder Name</label>
                    <input type="text" name="cardHolderName" value={formData.cardHolderName} onChange={handleChange} style={fieldStyle} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Card Number</label>
                    <input type="text" name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder="1234 5678 9012 3456" style={fieldStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>Expiry</label>
                    <input type="text" name="cardExpiry" value={formData.cardExpiry} onChange={handleChange} placeholder="MM/YY" style={fieldStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#334155", fontWeight: 600 }}>CVV</label>
                    <input type="password" name="cardCvv" value={formData.cardCvv} onChange={handleChange} maxLength="3" placeholder="***" style={fieldStyle} />
                  </div>
                  <div style={{ gridColumn: "1 / -1", borderRadius: "18px", padding: "16px 18px", backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                    Razorpay opens a real hosted checkout. Card details are never sent through this form.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="primary-btn" style={{ backgroundColor: "#475569" }} onClick={() => navigate("/bookings")}>
                  Back to Bookings
                </button>
                <button type="submit" className="success-btn" disabled={processing} style={{ minWidth: "180px" }}>
                  {processing ? "Processing payment..." : "Pay Securely"}
                </button>
              </div>
            </form>

            <aside style={{ ...cardStyle, padding: "24px" }}>
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#64748b", marginBottom: "10px" }}>
                Order details
              </div>
              <h2 style={{ marginTop: 0, marginBottom: "14px", color: "#0f172a" }}>{formData.customerName || "Customer"}</h2>
              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ padding: "14px 16px", borderRadius: "16px", backgroundColor: "#f8fafc" }}>
                  <div style={{ color: "#64748b", fontSize: "13px" }}>Vehicle</div>
                  <div style={{ color: "#0f172a", fontWeight: 700, marginTop: "4px" }}>{formData.vehicleName || "Linked booking vehicle"}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: "16px", backgroundColor: "#f8fafc" }}>
                  <div style={{ color: "#64748b", fontSize: "13px" }}>Payment method</div>
                  <div style={{ color: "#0f172a", fontWeight: 700, marginTop: "4px" }}>{selectedMethod}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: "16px", backgroundColor: "#0f172a", color: "#fff" }}>
                  <div style={{ color: "#cbd5e1", fontSize: "13px" }}>Expected transaction ID</div>
                  <div style={{ fontWeight: 700, marginTop: "4px" }}>Generated automatically on payment</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: "16px", background: "linear-gradient(135deg, #0f766e, #0ea5e9)", color: "#fff" }}>
                  <div style={{ fontSize: "13px", opacity: 0.88 }}>Delivery sync</div>
                  <div style={{ fontWeight: 700, marginTop: "4px" }}>Successful payment creates the delivery entry automatically.</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddPayment;
