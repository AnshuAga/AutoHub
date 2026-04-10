import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function EditDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();
  const canAssignStaff = role === "admin" || role === "manager";

  const [deliveryMen, setDeliveryMen] = useState([]);
  const [formData, setFormData] = useState({
    customerName: "",
    vehicleName: "",
    branch: "Main Branch",
    deliveryDate: "",
    notes: "",
    assignedDeliveryManId: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchDelivery = async () => {
    try {
      const requests = [api.get(`/deliveries/${id}`)];
      if (canAssignStaff) {
        requests.push(api.get("/deliveries/delivery-men"));
      }

      const responses = await Promise.all(requests);
      const response = responses[0];
      const deliveryMenResponse = canAssignStaff ? responses[1] : { data: [] };
      const delivery = response.data;

      setDeliveryMen(deliveryMenResponse.data || []);

      setFormData({
        customerName: delivery.customerName || "",
        vehicleName: delivery.vehicleName || "",
        branch: delivery.branch || "Main Branch",
        deliveryDate: delivery.deliveryDate ? new Date(delivery.deliveryDate).toISOString().slice(0, 10) : "",
        notes: delivery.notes || "",
        assignedDeliveryManId: delivery.assignedDeliveryMan?._id || delivery.assignedDeliveryMan || "",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.put(`/deliveries/${id}`, formData);
      alert(response.data.message);
      navigate("/deliveries");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDelivery();
  }, []);

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Edit Delivery</h1>

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

            {canAssignStaff && (
              <div style={{ marginBottom: "15px" }}>
                <label>Assign Delivery Man</label>
                <select name="assignedDeliveryManId" value={formData.assignedDeliveryManId} onChange={handleChange}>
                  <option value="">Not Assigned</option>
                  {deliveryMen.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} ({employee.branch})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} />
            </div>

            <button type="submit" className="primary-btn">
              Update Delivery
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default EditDelivery;
