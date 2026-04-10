import { useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function AddDelivery() {
  const [formData, setFormData] = useState({
    customerName: "",
    vehicleName: "",
    branch: "Main Branch",
    deliveryDate: "",
    status: "Pending",
    notes: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
        !formData.customerName ||
        !formData.vehicleName ||
        !formData.deliveryDate
      ) {
        alert("Please fill all fields");
        return;
      }

    try {
      const response = await api.post("/deliveries", formData);

      alert(response.data.message);

      setFormData({
        customerName: "",
        vehicleName: "",
        branch: "Main Branch",
        deliveryDate: "",
        status: "Pending",
        notes: "",
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
          <h1>Add Delivery</h1>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Customer Name</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle Name</label>
              <input type="text" name="vehicleName" value={formData.vehicleName} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Delivery Date</label>
              <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} />
            </div>

           <button type="submit" className="success-btn">
                Add Delivery
              </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddDelivery;
