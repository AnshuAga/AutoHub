import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function EditPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customerName: "",
    amount: "",
    method: "Debit Card",
    cardLast4: "",
    transactionId: "",
    branch: "Main Branch",
    status: "Pending",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchPayment = async () => {
    try {
      const response = await api.get(`/payments/${id}`);
      const payment = response.data;

      setFormData({
        customerName: payment.customerName || "",
        amount: payment.amount || "",
        method: payment.method || "Debit Card",
        cardLast4: payment.cardLast4 || "",
        transactionId: payment.transactionId || "",
        branch: payment.branch || "Main Branch",
        status: payment.status || "Pending",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.method === "Debit Card" && formData.cardLast4.length !== 4) {
      alert("Enter valid last 4 digits for debit card");
      return;
    }

    try {
      const response = await api.put(`/payments/${id}`, formData);
      alert(response.data.message);
      navigate("/payments");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, []);

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Edit Payment</h1>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Customer Name</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Amount</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Method</label>
              <select name="method" value={formData.method} onChange={handleChange}>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            {formData.method === "Debit Card" && (
              <div style={{ marginBottom: "15px" }}>
                <label>Card Last 4 Digits</label>
                <input type="text" name="cardLast4" maxLength="4" value={formData.cardLast4} onChange={handleChange} />
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label>Transaction ID</label>
              <input type="text" name="transactionId" value={formData.transactionId} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <button type="submit" className="primary-btn">
              Update Payment
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default EditPayment;
