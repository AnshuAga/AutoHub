import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function EditServiceBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();
  const isCustomer = role === "customer";
  const canAssignStaff = role === "admin" || role === "manager";
  const canUpdateStatus = role === "employee" || canAssignStaff;

  const [mechanics, setMechanics] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    vehicleName: "",
    vehicleNumber: "",
    branch: "",
    scheduledDate: "",
    scheduledTime: "",
    issueDescription: "",
    assignedMechanicId: "",
    status: "Pending",
    estimatedCost: 0,
    actualCost: 0,
  });

  const fetchData = async () => {
    try {
      const requests = [api.get(`/services/bookings/${id}`)];
      if (canAssignStaff) {
        requests.push(api.get("/services/mechanics"));
      }

      const responses = await Promise.all(requests);
      const bookingRes = responses[0];
      const mechanicsRes = canAssignStaff ? responses[1] : { data: [] };

      const booking = bookingRes.data;
      setMechanics(mechanicsRes.data || []);
      setSelectedServices(booking.selectedServices || []);
      setFormData({
        customerName: booking.customerName || "",
        customerEmail: booking.customerEmail || "",
        customerPhone: booking.customerPhone || "",
        vehicleName: booking.vehicleName || "",
        vehicleNumber: booking.vehicleNumber || "",
        branch: booking.branch || "",
        scheduledDate: booking.scheduledDate ? new Date(booking.scheduledDate).toISOString().slice(0, 10) : "",
        scheduledTime: booking.scheduledTime || "",
        issueDescription: booking.issueDescription || "",
        assignedMechanicId: booking.assignedMechanicId || "",
        status: booking.status || "Pending",
        estimatedCost: booking.estimatedCost || 0,
        actualCost: booking.actualCost || 0,
      });
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load booking");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = isCustomer
        ? {
            issueDescription: formData.issueDescription,
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
          }
        : formData;

      const response = await api.put(`/services/bookings/${id}`, payload);
      alert(response.data.message || "Updated");
      navigate("/service-bookings");
    } catch (error) {
      alert(error.response?.data?.message || "Update failed");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Edit Service Booking</h1>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Customer Name</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} disabled={isCustomer} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle</label>
              <input type="text" name="vehicleName" value={formData.vehicleName} onChange={handleChange} disabled={isCustomer} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle Number</label>
              <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} disabled={isCustomer} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Selected Services</label>
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "4px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                {selectedServices.length > 0 ? (
                  <div>
                    {selectedServices.map((service) => (
                      <div
                        key={service.serviceName}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                          padding: "8px",
                          backgroundColor: "#fff",
                          borderRadius: "4px",
                          border: "1px solid #eee",
                        }}
                      >
                        <span>{service.serviceName}</span>
                        <span style={{ fontWeight: "bold", color: "#2196F3" }}>₹{service.price}</span>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "10px",
                        borderTop: "2px solid #2196F3",
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: "bold",
                        fontSize: "16px",
                      }}
                    >
                      <span>Total:</span>
                      <span style={{ color: "#2196F3" }}>
                        ₹{selectedServices.reduce((sum, s) => sum + (s.price || 0), 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p>No services selected</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Preferred Date</label>
              <input type="date" name="scheduledDate" value={formData.scheduledDate} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Preferred Time</label>
              <input type="time" name="scheduledTime" value={formData.scheduledTime} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Issue Description</label>
              <textarea name="issueDescription" value={formData.issueDescription} onChange={handleChange} />
            </div>

            {canAssignStaff && (
              <>
                <div style={{ marginBottom: "15px" }}>
                  <label>Assign Mechanic / Staff</label>
                  <select name="assignedMechanicId" value={formData.assignedMechanicId} onChange={handleChange}>
                    <option value="">Not Assigned</option>
                    {mechanics.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} ({employee.designation}) - {employee.branch}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label>Estimated Cost</label>
                  <input type="number" name="estimatedCost" value={formData.estimatedCost} onChange={handleChange} />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label>Actual Cost</label>
                  <input type="number" name="actualCost" value={formData.actualCost} onChange={handleChange} />
                </div>
              </>
            )}

            {canUpdateStatus && (
              <div style={{ marginBottom: "15px" }}>
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Service">In Service</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}

            <button type="submit" className="primary-btn">
              Update Service Booking
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default EditServiceBooking;
