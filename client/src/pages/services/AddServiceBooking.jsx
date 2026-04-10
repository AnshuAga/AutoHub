import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import { isTenDigitPhoneNumber, normalizePhoneInput } from "../../utils/phone";

function AddServiceBooking() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();

  if (role !== "customer") {
    return (
      <div>
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="content-container">
            <h1>Book Repair / Service</h1>
            <p>Only customers can create service bookings.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const [categories, setCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: user?.name || "",
    customerEmail: user?.email || "",
    customerPhone: user?.phone || "",
    vehicleName: "",
    vehicleNumber: "",
    branch: user?.branch || "Main Branch",
    scheduledDate: "",
    scheduledTime: "",
    issueDescription: "",
    estimatedCost: 0,
  });

  const BRANCH_OPTIONS = ["Main Branch", "Delhi", "Mumbai"];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/services/categories");
        const loaded = (response.data || []).filter((category) => category.isActive);
        setCategories(loaded);
      } catch (error) {
        console.log(error);
      }
    };

    fetchCategories();
  }, []);

  const handleServiceToggle = (service) => {
    setSelectedServices((current) => {
      const isSelected = current.some((s) => s._id === service._id);

      let updated;
      if (isSelected) {
        updated = current.filter((s) => s._id !== service._id);
      } else {
        updated = [...current, service];
      }

      const totalCost = updated.reduce((sum, s) => sum + (s.price || 0), 0);
      setFormData((prev) => ({ ...prev, estimatedCost: totalCost }));

      return updated;
    });
  };

  const handleChange = (event) => {
    const nextValue = event.target.name === "customerPhone" ? normalizePhoneInput(event.target.value) : event.target.value;
    setFormData((current) => ({
      ...current,
      [event.target.name]: nextValue,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.customerName || !formData.vehicleName || !formData.branch || selectedServices.length === 0 || !formData.scheduledDate) {
      alert("Please fill required fields and select at least one service");
      return;
    }

    if (!isTenDigitPhoneNumber(formData.customerPhone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    const bookingData = {
      ...formData,
      selectedServices: selectedServices.map((s) => ({
        serviceId: s._id,
        serviceName: s.name,
        price: s.price,
      })),
    };

    try {
      const response = await api.post("/services/bookings", bookingData);
      alert(response.data.message || "Service booked");
      setSelectedServices([]);
      setFormData((current) => ({
        ...current,
        vehicleName: "",
        vehicleNumber: "",
        scheduledDate: "",
        scheduledTime: "",
        issueDescription: "",
        estimatedCost: 0,
      }));
    } catch (error) {
      alert(error.response?.data?.message || "Booking failed");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Book Repair / Service</h1>

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
              <label>Vehicle Name</label>
              <input type="text" name="vehicleName" value={formData.vehicleName} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle Number</label>
              <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Branch</label>
              <select name="branch" value={formData.branch} onChange={handleChange}>
                {BRANCH_OPTIONS.map((branchOption) => (
                  <option key={branchOption} value={branchOption}>
                    {branchOption}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Select Services</label>
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#f5f5f5",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#efefef")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
                >
                  <span>
                    {selectedServices.length === 0
                      ? "Click to select services"
                      : `${selectedServices.length} service(s) selected`}
                  </span>
                  <span style={{ fontSize: "18px" }}>{dropdownOpen ? "▼" : "▶"}</span>
                </button>

                {dropdownOpen && (
                  <div
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      backgroundColor: "#ffffff",
                      borderTop: "1px solid #ddd",
                    }}
                  >
                    {categories.length > 0 ? (
                      categories.map((service) => (
                        <div
                          key={service._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "12px",
                            borderBottom: "1px solid #eee",
                            backgroundColor: selectedServices.some((s) => s._id === service._id)
                              ? "#e3f2fd"
                              : "transparent",
                            cursor: "pointer",
                            transition: "background-color 0.2s",
                          }}
                          onMouseOver={(e) => {
                            if (!selectedServices.some((s) => s._id === service._id)) {
                              e.currentTarget.style.backgroundColor = "#f9f9f9";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!selectedServices.some((s) => s._id === service._id)) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            id={`service-${service._id}`}
                            checked={selectedServices.some((s) => s._id === service._id)}
                            onChange={() => handleServiceToggle(service)}
                            style={{ marginRight: "12px", cursor: "pointer", width: "18px", height: "18px" }}
                          />
                          <label
                            htmlFor={`service-${service._id}`}
                            style={{ cursor: "pointer", flex: 1, margin: 0 }}
                          >
                            <div style={{ fontWeight: "500", fontSize: "14px" }}>{service.name}</div>
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              {service.description || "No description"}
                            </div>
                          </label>
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "#2196F3",
                              fontSize: "14px",
                              minWidth: "50px",
                              textAlign: "right",
                            }}
                          >
                            ₹{service.price}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "12px", color: "#999", textAlign: "center" }}>
                        No services available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                border: "2px solid #2196F3",
              }}>
                <strong>Selected Services:</strong>
                <div style={{ marginTop: "5px" }}>
                  {selectedServices.map((s) => (
                    <div key={s._id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span>{s.name}</span>
                      <span>₹{s.price}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid #ddd",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}>
                  <span>Estimated Total:</span>
                  <span style={{ color: "#2196F3" }}>₹{formData.estimatedCost}</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label>Preferred Date</label>
              <input type="date" name="scheduledDate" value={formData.scheduledDate} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Preferred Time</label>
              <input type="time" name="scheduledTime" value={formData.scheduledTime} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Issue Description / Vehicle Problem</label>
              <textarea name="issueDescription" value={formData.issueDescription} onChange={handleChange} />
            </div>

            <button type="submit" className="success-btn">
              Create Service Booking
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddServiceBooking;
