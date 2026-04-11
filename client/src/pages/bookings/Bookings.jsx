import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function Bookings() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const isCustomer = (user?.role || "").toLowerCase() === "customer";

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/bookings.png")',
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
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
 const [loading, setLoading] = useState(true);
 const fetchBookings = async () => {
  try {
    const response = await api.get("/bookings", {
      params: {
        q: searchTerm,
        status,
        ...(isCustomer && user?.email ? { customerEmail: user.email } : {}),
      },
    });
    setBookings(response.data);
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
    const confirmDelete = window.confirm("Delete this booking?");
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.delete(`/bookings/${id}`);
      alert(response.data.message);
      fetchBookings();
    } catch (error) {
      console.log(error);
    }
  };

  const handleProceedToPay = (booking) => {
    localStorage.setItem(
      "selectedPaymentBooking",
      JSON.stringify({
        bookingId: booking._id,
        bookingNo: booking.bookingNo || "",
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        vehicleName: booking.vehicleName,
        amount: booking.amount || "",
        branch: booking.branch || "Main Branch",
      })
    );

    navigate("/add-payment");
  };

  const handleDownloadInvoice = async (booking) => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF();
    const invoiceNo = booking.bookingNo || booking._id?.slice(-6) || "N/A";

    doc.setFontSize(18);
    doc.text("AutoHub Vehicle Invoice", 14, 18);
    doc.setFontSize(11);
    doc.text(`Invoice No: ${invoiceNo}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Field", "Details"]],
      body: [
        ["Booking No", booking.bookingNo || "-"],
        ["Customer", booking.customerName || "-"],
        ["Email", booking.customerEmail || "-"],
        ["Phone", booking.customerPhone || "-"],
        ["Vehicle", booking.vehicleName || "-"],
        ["Vehicle Type", booking.vehicleType || booking.vehicleCategory || "-"],
        ["Variant", booking.vehicleVariant || "-"],
        ["Color", booking.vehicleColor || "-"],
        ["Branch", booking.branch || "Main Branch"],
        ["Booking Date", booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : "-"],
        ["Status", booking.status || "-"],
        ["Payment Status", booking.paymentStatus || "-"],
        ["Payment Method", booking.paymentMethod || "-"],
        ["Transaction ID", booking.transactionId || "-"],
        ["Amount", `INR ${Number(booking.amount || 0).toLocaleString("en-IN")}`],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [15, 76, 129] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } },
    });

    doc.save(`${booking.bookingNo || "vehicle-invoice"}.pdf`);
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Bookings</h1>
            <div style={{ marginTop: "20px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder={isCustomer ? "Search by vehicle, status or branch..." : "Search by customer, vehicle or branch..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "300px" }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "180px", marginLeft: "10px" }}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button className="primary-btn small-btn" style={{ marginLeft: "10px" }} onClick={() => {
              setLoading(true);
              fetchBookings();
            }}>
              Search
            </button>
          </div>
            {loading ? (
                <p>Loading bookings...</p>
              ) : (

          <table border="1" cellPadding="6" style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th>Booking No</th>
                <th>{isCustomer ? "Vehicle" : "Customer Name"}</th>
                <th>Vehicle (Car/Bike)</th>
                <th>Booking Date</th>
                <th>Status</th>
                <th>Payment Status</th>
                <th>Transaction ID</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
  {bookings.length > 0 ? (
    bookings.map((booking) => (
      <tr key={booking._id}>
        <td>{booking.bookingNo || booking._id?.slice(-6) || "-"}</td>
        <td>{isCustomer ? booking.vehicleName : booking.customerName}</td>
        <td>
          {(booking.vehicleCategory || booking.vehicleType || "-").toString()}
          {(booking.vehicleVariant || booking.vehicleColor)
            ? ` (${booking.vehicleVariant || "-"} / ${booking.vehicleColor || "-"})`
            : ""}
        </td>
        <td>{new Date(booking.bookingDate).toLocaleDateString()}</td>
        <td>{booking.status}</td>
        <td>{booking.paymentStatus || "Unpaid"}</td>
        <td>{booking.transactionId || "-"}</td>
        <td>
          <div style={{ display: "flex", gap: "10px" }}>
            {isCustomer && booking.paymentStatus !== "Paid" ? (
              <button className="success-btn small-btn" onClick={() => handleProceedToPay(booking)}>
                Proceed to Pay
              </button>
            ) : null}
            {String(booking.paymentStatus || "").toLowerCase() === "paid" ? (
              <button className="ghost-btn small-btn" onClick={() => handleDownloadInvoice(booking)}>
                Download Invoice
              </button>
            ) : null}
            <Link to={`/edit-booking/${booking._id}`}>
              <button className="primary-btn small-btn">Edit</button>
            </Link>
            <button className="danger-btn small-btn" onClick={() => handleDelete(booking._id)}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="8" style={{ textAlign: "center" }}>
        No bookings found
      </td>
    </tr>
  )}
</tbody>
          </table>
              )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Bookings;
