import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

const STATUS_OPTIONS = ["Pending", "Confirmed", "In Service", "Completed", "Cancelled"];

function ServiceBookings() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase().trim();
  const rawDesignation = String(user?.designation || "").toLowerCase().trim();
  const employeeRole = String(user?.employeeRole || "").toLowerCase().trim();
  const normalizedRole = role === "deliveryman" ? "delivery man" : role;
  const normalizedDesignation = rawDesignation === "deliveryman" ? "delivery man" : rawDesignation;
  const staffRole =
    (employeeRole === "deliveryman" ? "delivery man" : employeeRole) ||
    (normalizedDesignation && normalizedDesignation !== "employee" && normalizedDesignation !== "branch manager"
      ? normalizedDesignation
      : normalizedRole === "mechanic" || normalizedRole === "delivery man"
        ? normalizedRole
        : "");
  const isCustomer = normalizedRole === "customer";
  const isMechanic = staffRole === "mechanic";
  const isBranchManager =
    normalizedRole === "manager" ||
    staffRole === "branch manager" ||
    normalizedDesignation === "branch manager" ||
    employeeRole === "branch manager";
  const canManage = normalizedRole === "admin" || isBranchManager || isMechanic;
  const canAssignStaff = normalizedRole === "admin" || isBranchManager;

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/service-booking.png")',
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

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
  const [mechanics, setMechanics] = useState([]);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState(null);
  const [assignmentMechanicId, setAssignmentMechanicId] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assigningBookingId, setAssigningBookingId] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentError, setPaymentError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    upiId: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    cardHolderName: "",
  });

  useEffect(() => {
    const fetchMechanics = async () => {
      if (!canAssignStaff) {
        return;
      }

      try {
        const response = await api.get("/services/mechanics");
        setMechanics(response.data || []);
      } catch (error) {
        console.log(error);
      }
    };

    fetchMechanics();
  }, [canAssignStaff]);

  const fetchBookings = async () => {
    try {
      const response = await api.get("/services/bookings", {
        params: {
          q: searchTerm,
          status,
          ...(isCustomer && user?.email ? { customerEmail: user.email } : {}),
        },
      });
      setBookings(response.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service booking?")) {
      return;
    }

    try {
      const response = await api.delete(`/services/bookings/${id}`);
      alert(response.data.message || "Deleted");
      fetchBookings();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const generateTransactionId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `TXN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    }

    return `TXN-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
  };

  const openPaymentModal = (booking) => {
    setPaymentTarget(booking);
    setPaymentMethod("UPI");
    setPaymentForm({
      upiId: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      cardHolderName: "",
    });
    setPaymentError("");
    setPaymentSuccessMessage("");
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentTarget(null);
    setPaymentError("");
    setPaymentProcessing(false);
  };

  const handlePaymentInputChange = (event) => {
    setPaymentForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const submitServicePayment = async () => {
    if (!paymentTarget) {
      return;
    }

    if (paymentMethod === "UPI" && !paymentForm.upiId.trim()) {
      setPaymentError("Enter a valid UPI ID");
      return;
    }

    if (paymentMethod === "Credit Card") {
      const cardDigits = paymentForm.cardNumber.replace(/\s+/g, "");
      const expiryMatch = /^(0[1-9]|1[0-2])\/\d{2}$/;

      if (cardDigits.length !== 16 || !/^\d{16}$/.test(cardDigits)) {
        setPaymentError("Enter a valid 16-digit card number");
        return;
      }

      if (!expiryMatch.test(paymentForm.cardExpiry.trim())) {
        setPaymentError("Enter a valid expiry in MM/YY format");
        return;
      }

      if (!/^\d{3}$/.test(paymentForm.cardCvv.trim())) {
        setPaymentError("Enter a valid 3-digit CVV");
        return;
      }

      if (!paymentForm.cardHolderName.trim()) {
        setPaymentError("Enter the card holder name");
        return;
      }
    }

    try {
      setPaymentProcessing(true);
      setPaymentError("");
      const transactionId = generateTransactionId();
      const response = await api.put(`/services/bookings/${paymentTarget._id}`, {
        paymentStatus: "Paid",
        paymentMethod: paymentMethod,
        transactionId,
      });

      closePaymentModal();
      setPaymentSuccessMessage(
        `${response.data.message || "Payment completed"}. Transaction ID: ${transactionId}`
      );
      fetchBookings();
    } catch (error) {
      setPaymentError(error.response?.data?.message || "Payment update failed");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleAssignToMe = async (bookingId) => {
    try {
      const response = await api.put(`/services/bookings/${bookingId}/assign-self`);
      alert(response.data.message || "Assigned to you");
      fetchBookings();
    } catch (error) {
      alert(error.response?.data?.message || "Assign failed");
    }
  };

  const handleMarkComplete = async (bookingId) => {
    try {
      const response = await api.put(`/services/bookings/${bookingId}`, {
        status: "Completed",
      });
      alert(response.data.message || "Marked complete");
      fetchBookings();
    } catch (error) {
      alert(error.response?.data?.message || "Update failed");
    }
  };

  const handleAssignMechanic = async (bookingId) => {
    setAssignmentTarget(bookings.find((item) => item._id === bookingId) || null);
    setAssignmentMechanicId(
      bookings.find((item) => item._id === bookingId)?.assignedMechanicId || ""
    );
    setAssignmentError("");
    setAssignmentModalOpen(true);
  };

  const closeAssignmentModal = () => {
    setAssignmentModalOpen(false);
    setAssignmentTarget(null);
    setAssignmentMechanicId("");
    setAssignmentError("");
    setAssigningBookingId("");
  };

  const submitAssignment = async () => {
    if (!assignmentTarget) {
      return;
    }

    try {
      setAssigningBookingId(assignmentTarget._id);
      setAssignmentError("");
      const response = await api.put(`/services/bookings/${assignmentTarget._id}`, {
        assignedMechanicId: assignmentMechanicId,
      });
      closeAssignmentModal();
      fetchBookings();
      console.log(response.data.message || "Assignment updated");
    } catch (error) {
      setAssignmentError(error.response?.data?.message || "Assign failed");
    } finally {
      setAssigningBookingId("");
    }
  };

  const handleDownloadInvoice = async (booking) => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF();
    const invoiceNo = booking.invoiceNo || booking.serviceNo || booking._id?.slice(-6) || "N/A";

    doc.setFontSize(18);
    doc.text("AutoHub Service Invoice", 14, 18);
    doc.setFontSize(11);
    doc.text(`Invoice No: ${invoiceNo}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Field", "Details"]],
      body: [
        ["Service No", booking.serviceNo || booking._id || "-"],
        ["Customer", booking.customerName || "-"],
        ["Email", booking.customerEmail || "-"],
        ["Phone", booking.customerPhone || "-"],
        ["Vehicle", booking.vehicleName || "-"],
        ["Vehicle Number", booking.vehicleNumber || "-"],
        ["Mechanic", booking.assignedMechanicName || "Not Assigned"],
        ["Issue", booking.issueDescription || "-"],
        ["Status", booking.status || "-"],
        ["Payment Status", booking.paymentStatus || "-"],
        ["Payment Method", booking.paymentMethod || "-"],
        ["Transaction ID", booking.transactionId || "-"],
        ["Estimated Cost", `INR ${Number(booking.estimatedCost || 0).toLocaleString("en-IN")}`],
        ["Actual Cost", `INR ${Number(booking.actualCost || 0).toLocaleString("en-IN")}`],
        ["Branch", booking.branch || "Main Branch"],
        ["Completed At", booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : "-"],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [15, 118, 110] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } },
    });

    const serviceRows = (booking.selectedServices || []).map((service) => [
      service.serviceName || "Service",
      `INR ${Number(service.price || 0).toLocaleString("en-IN")}`,
    ]);

    if (serviceRows.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [["Selected Service", "Price"]],
        body: serviceRows,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [29, 78, 216] },
      });
    }

    doc.save(`${booking.invoiceNo || booking.serviceNo || "service-invoice"}.pdf`);
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>{isCustomer ? "My Services" : isMechanic ? "My Assigned Repairs" : "Service Bookings"}</h1>

          {paymentSuccessMessage ? (
            <div
              style={{
                marginTop: "12px",
                marginBottom: "12px",
                backgroundColor: "#ecfdf3",
                color: "#067647",
                border: "1px solid #abefc6",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "14px",
              }}
            >
              {paymentSuccessMessage}
            </div>
          ) : null}

          <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by service no, customer, vehicle, mechanic"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ width: "320px" }}
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={{ width: "180px" }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button className="primary-btn small-btn" onClick={() => {
              setLoading(true);
              fetchBookings();
            }}>
              Search
            </button>
            {isCustomer && (
              <Link to="/add-service-booking">
                <button className="success-btn small-btn">Book Service</button>
              </Link>
            )}
            {(normalizedRole === "admin" || isBranchManager) && (
              <Link to="/service-categories">
                <button className="ghost-btn small-btn">Manage Categories</button>
              </Link>
            )}
          </div>

          {loading ? (
            <p>Loading service bookings...</p>
          ) : (
            <table border="1" cellPadding="6" style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th>Service No</th>
                  <th>{isCustomer || isMechanic ? "Vehicle" : "Customer"}</th>
                  <th>Service Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Mechanic</th>
                  <th>Estimated</th>
                  <th>Actual</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.serviceNo || booking._id?.slice(-6)}</td>
                      <td>{isCustomer || isMechanic ? booking.vehicleName : booking.customerName}</td>
                      <td>
                        {booking.selectedServices && booking.selectedServices.length > 0
                          ? booking.selectedServices.map((s) => s.serviceName).join(", ")
                          : "N/A"}
                      </td>
                      <td>{new Date(booking.scheduledDate).toLocaleDateString()} {booking.scheduledTime || ""}</td>
                      <td>{booking.status}</td>
                      <td>{booking.assignedMechanicName || "Not Assigned"}</td>
                      <td>{booking.estimatedCost || 0}</td>
                      <td>{booking.actualCost || 0}</td>
                      <td>{booking.paymentStatus}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {isCustomer && booking.paymentStatus !== "Paid" && booking.actualCost > 0 ? (
                            <button className="success-btn small-btn" onClick={() => openPaymentModal(booking)}>
                              Pay Online
                            </button>
                          ) : null}

                          {booking.status === "Completed" && String(booking.paymentStatus || "").toLowerCase() === "paid" ? (
                            <button className="ghost-btn small-btn" onClick={() => handleDownloadInvoice(booking)}>
                              Download Invoice
                            </button>
                          ) : null}

                          {canManage ? (
                            <Link to={`/edit-service-booking/${booking._id}`}>
                              <button className="primary-btn small-btn">Edit</button>
                            </Link>
                          ) : null}

                          {isMechanic && booking.status !== "Completed" ? (
                            <button className="success-btn small-btn" onClick={() => handleMarkComplete(booking._id)}>
                              Mark Complete
                            </button>
                          ) : null}

                          {canAssignStaff && String(booking.paymentStatus || "").toLowerCase() !== "paid" ? (
                            <button
                              className="success-btn small-btn"
                              onClick={() => handleAssignMechanic(booking._id)}
                              disabled={assigningBookingId === booking._id || mechanics.length === 0}
                            >
                              {assigningBookingId === booking._id ? "Assigning..." : "Assign"}
                            </button>
                          ) : null}

                          {role === "admin" ? (
                            <button className="danger-btn small-btn" onClick={() => handleDelete(booking._id)}>
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center" }}>
                      No service bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {assignmentModalOpen && assignmentTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(6, 16, 30, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "16px",
          }}
          onClick={closeAssignmentModal}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "440px",
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Assign mechanic</h3>
            <p style={{ marginTop: 0, color: "#5b6472" }}>
              {assignmentTarget.serviceNo || assignmentTarget._id?.slice(-6) || "Booking"}
            </p>

            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Mechanic</label>
            <select
              value={assignmentMechanicId}
              onChange={(event) => setAssignmentMechanicId(event.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            >
              <option value="">Not Assigned</option>
              {mechanics.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name} ({employee.branch})
                </option>
              ))}
            </select>

            {assignmentError ? (
              <div style={{ marginBottom: "12px", color: "#b42318", fontSize: "14px" }}>{assignmentError}</div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="ghost-btn small-btn" onClick={closeAssignmentModal}>
                Cancel
              </button>
              <button type="button" className="success-btn small-btn" onClick={submitAssignment}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentModalOpen && paymentTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(6, 16, 30, 0.62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: "16px",
          }}
          onClick={closePaymentModal}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              backgroundColor: "#fff",
              borderRadius: "18px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b", fontSize: "12px" }}>
              Razorpay-style checkout
            </p>
            <h3 style={{ marginTop: "8px", marginBottom: "6px" }}>Secure payment gateway</h3>
            <p style={{ marginTop: 0, color: "#475569" }}>
              {paymentTarget.serviceNo || paymentTarget._id?.slice(-6)} • ₹{Number(paymentTarget.actualCost || 0).toLocaleString("en-IN")}
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
              <button
                type="button"
                onClick={() => setPaymentMethod("UPI")}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: paymentMethod === "UPI" ? "1px solid #0f766e" : "1px solid #d0d5dd",
                  background: paymentMethod === "UPI" ? "rgba(15, 118, 110, 0.08)" : "#fff",
                  fontWeight: 600,
                }}
              >
                UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("Credit Card")}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: paymentMethod === "Credit Card" ? "1px solid #0f766e" : "1px solid #d0d5dd",
                  background: paymentMethod === "Credit Card" ? "rgba(15, 118, 110, 0.08)" : "#fff",
                  fontWeight: 600,
                }}
              >
                Credit Card
              </button>
            </div>

            {paymentMethod === "UPI" ? (
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>UPI ID</label>
                <input
                  type="text"
                  name="upiId"
                  value={paymentForm.upiId}
                  onChange={handlePaymentInputChange}
                  placeholder="name@bank"
                />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "12px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Card Holder Name</label>
                  <input type="text" name="cardHolderName" value={paymentForm.cardHolderName} onChange={handlePaymentInputChange} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Card Number</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={paymentForm.cardNumber}
                    onChange={handlePaymentInputChange}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Expiry</label>
                  <input type="text" name="cardExpiry" value={paymentForm.cardExpiry} onChange={handlePaymentInputChange} placeholder="MM/YY" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>CVV</label>
                  <input type="password" name="cardCvv" value={paymentForm.cardCvv} onChange={handlePaymentInputChange} maxLength="3" placeholder="***" />
                </div>
                <div style={{ gridColumn: "1 / -1", borderRadius: "10px", padding: "10px", backgroundColor: "#eff6ff", color: "#1d4ed8", fontSize: "13px" }}>
                  Dummy checkout only. Card inputs are used to simulate secure payment.
                </div>
              </div>
            )}

            {paymentError ? (
              <div style={{ marginBottom: "12px", color: "#b42318", fontSize: "14px" }}>{paymentError}</div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="ghost-btn small-btn" onClick={closePaymentModal}>
                Cancel
              </button>
              <button type="button" className="success-btn small-btn" onClick={submitServicePayment} disabled={paymentProcessing}>
                {paymentProcessing ? "Processing..." : "Pay Securely"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}

export default ServiceBookings;
