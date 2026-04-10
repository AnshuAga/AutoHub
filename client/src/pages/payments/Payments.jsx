import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function Payments() {
  const user = JSON.parse(localStorage.getItem("user"));
  const isCustomer = (user?.role || "").toLowerCase() === "customer";

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/payment.png")',
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

  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
  try {
    const response = await api.get("/payments", {
      params: {
        q: searchTerm,
        method,
        status,
        ...(isCustomer && user?.email ? { customerEmail: user.email } : {}),
      },
    });
    setPayments(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this payment?");
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.delete(`/payments/${id}`);
      alert(response.data.message);
      fetchPayments();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Payments</h1>
          <div style={{ marginTop: "20px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder={isCustomer ? "Search by transaction, card or amount..." : "Search by customer, transaction or card..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "300px" }}
            />
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: "180px", marginLeft: "10px" }}>
              <option value="">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Online">Online</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "180px", marginLeft: "10px" }}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
            <button className="primary-btn small-btn" style={{ marginLeft: "10px" }} onClick={() => {
              setLoading(true);
              fetchPayments();
            }}>
              Search
            </button>
          </div>
          {loading ? (
            <p>Loading deliveries...</p>
          ) : (

          <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Booking No</th>
                <th>{isCustomer ? "Transaction" : "Customer Name"}</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Transaction ID</th>
                <th>Action</th>
              </tr>
            </thead>

           <tbody>
  {payments.length > 0 ? (
    payments.map((payment, index) => (
      <tr key={payment._id}>
        <td>{payment.bookingNo || payment.bookingId?.bookingNo || "-"}</td>
        <td>{isCustomer ? payment.transactionId || payment.cardLast4 || "-" : payment.customerName}</td>
        <td>{payment.amount}</td>
        <td>{String(payment.status || "").toLowerCase() === "completed" ? payment.method || "-" : "-"}</td>
        <td>{payment.status}</td>
        <td>{payment.transactionId || "-"}</td>
        <td>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to={`/edit-payment/${payment._id}`}>
              <button className="primary-btn small-btn">Edit</button>
            </Link>
            <button className="danger-btn small-btn" onClick={() => handleDelete(payment._id)}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="7" style={{ textAlign: "center" }}>
        No payments found
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

export default Payments;
