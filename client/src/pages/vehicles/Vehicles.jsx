import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

const getTodayDate = () => new Date().toISOString().split("T")[0];

function Vehicles() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = (user?.role || "customer").toLowerCase();
  const isAdmin = role === "admin";
  const canBookVehicle = role === "customer";
  const isMechanic = role === "mechanic" || (user?.employeeRole === "Mechanic");
  const isDeliveryMan = role === "delivery man" || role === "deliveryman" || (user?.employeeRole === "Delivery Man");

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/Vehicles.png")',
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

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState({
    customerName: user?.name || "",
    customerEmail: user?.email || "",
    customerPhone: user?.phone || "",
    customerAddress: "",
    bookingDate: getTodayDate(),
    branch: "Main Branch",
  });

  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const fetchVehicles = async (customFilters = {}) => {
  try {
    const response = await api.get("/vehicles", {
      params: {
        q: customFilters.q ?? searchTerm,
        category: customFilters.category ?? category,
        status: customFilters.status ?? status,
      },
    });
    setVehicles(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};
  const handleDelete = async (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this vehicle?"
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await api.delete(`/vehicles/${id}`);

    alert(response.data.message);

    fetchVehicles();
  } catch (error) {
    console.log(error);
  }
};

  const handleBookVehicle = (vehicle) => {
    setBookingVehicle(vehicle);
    setBookingForm((previous) => ({
      ...previous,
      customerName: user?.name || previous.customerName,
      customerEmail: user?.email || previous.customerEmail,
      customerPhone: user?.phone || previous.customerPhone,
      bookingDate: getTodayDate(),
      branch: vehicle.showroomBranch || "Main Branch",
    }));
  };

  const handleBookingInputChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const closeBookingModal = () => {
    setBookingVehicle(null);
    setBookingSubmitting(false);
  };

  const submitBooking = async (event) => {
    event.preventDefault();

    if (!bookingVehicle) {
      return;
    }

    if (!bookingForm.customerName || !bookingForm.customerEmail || !bookingForm.customerPhone || !bookingForm.bookingDate) {
      alert("Please fill customer name, email, phone and booking date.");
      return;
    }

    try {
      setBookingSubmitting(true);
      await api.post("/bookings", {
        vehicleId: bookingVehicle._id,
        customerName: bookingForm.customerName,
        customerEmail: bookingForm.customerEmail,
        customerPhone: bookingForm.customerPhone,
        customerAddress: bookingForm.customerAddress,
        vehicleName: bookingVehicle.vehicleName,
        vehicleType: bookingVehicle.type,
        vehicleCategory: bookingVehicle.category,
        branch: bookingVehicle.showroomBranch || bookingForm.branch,
        bookingDate: bookingForm.bookingDate,
        status: "Confirmed",
        paymentStatus: "Unpaid",
        paymentMethod: "Debit Card",
        amount: bookingVehicle.price,
      });

      alert("Booking added successfully. Customer and booking records updated.");
      closeBookingModal();
      navigate("/bookings");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create booking");
      setBookingSubmitting(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    fetchVehicles();
  };

  const sortedVehicles = useMemo(() => {
    const list = [...vehicles];

    if (sortBy === "price-asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "stock-desc") {
      list.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list;
  }, [vehicles, sortBy]);

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Vehicles</h1>
          {isAdmin ? (
            <div style={{ marginTop: "10px" }}>
              <Link to="/add-vehicle">
                <button className="primary-btn">Add Vehicle</button>
              </Link>
            </div>
          ) : null}
          <div style={{ marginTop: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search by name, brand or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "280px",
                  padding: "10px",
                }}
              />
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "180px" }}>
                <option value="">All Categories</option>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "180px" }}>
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Sold">Sold</option>
              </select>
              <button onClick={handleSearch} className="primary-btn small-btn">Search</button>
              </div>
            </div>
            <div className="vehicle-sort-row">
              <span className="vehicle-sort-label">Sort:</span>
              <button
                type="button"
                className={`vehicle-sort-chip ${sortBy === "price-asc" ? "active" : ""}`}
                onClick={() => setSortBy("price-asc")}
              >
                Price low-high
              </button>
              <button
                type="button"
                className={`vehicle-sort-chip ${sortBy === "newest" ? "active" : ""}`}
                onClick={() => setSortBy("newest")}
              >
                Newest
              </button>
              <button
                type="button"
                className={`vehicle-sort-chip ${sortBy === "stock-desc" ? "active" : ""}`}
                onClick={() => setSortBy("stock-desc")}
              >
                Most available
              </button>
            </div>
            {loading ? (
              <p>Loading vehicles...</p>
            ) : (
              sortedVehicles.length > 0 ? (
                <div className="vehicle-card-grid">
                  {sortedVehicles.map((vehicle) => {
                    const isVehicleAvailable = vehicle.status === "Available" && Number(vehicle.stock || 0) > 0;
                    const statusToken = String(vehicle.status || "unknown").toLowerCase().replace(/\s+/g, "-");

                    return (
                      <article key={vehicle._id} className="card vehicle-card vehicle-card-compact">
                        <div className="vehicle-card-topline">
                          <div className="vehicle-card-thumb">
                            {vehicle.vehicleImage ? (
                              <img
                                src={vehicle.vehicleImage}
                                alt={vehicle.vehicleName}
                                className="vehicle-card-thumb-image"
                              />
                            ) : (
                              <div className="vehicle-card-thumb-placeholder">No Image</div>
                            )}
                          </div>

                          <div className="vehicle-card-title-wrap">
                            <h3 style={{ margin: "0 0 4px" }}>{vehicle.vehicleName}</h3>
                            <p style={{ margin: "0 0 8px" }}>
                              {(vehicle.category || "Vehicle").toUpperCase()} • {vehicle.type}
                            </p>
                            {isMechanic && vehicle.assignmentType && (
                              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#666" }}>
                                <strong>{vehicle.assignmentType}</strong>
                                {vehicle.assignmentNotes && ` - ${vehicle.assignmentNotes}`}
                              </p>
                            )}
                            <div className="vehicle-status-row">
                              <span className={`vehicle-status-pill vehicle-status-${statusToken}`}>{vehicle.status || "-"}</span>
                              <span className={Number(vehicle.stock || 0) > 0 ? "stock-ok" : "stock-low"}>
                                Available: {vehicle.stock || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="vehicle-action-row">
                          {canBookVehicle ? (
                            <button
                              onClick={() => handleBookVehicle(vehicle)}
                              className="success-btn small-btn"
                              disabled={!isVehicleAvailable}
                            >
                              {isVehicleAvailable ? "Book Now" : "Unavailable"}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="ghost-btn small-btn"
                            onClick={() => setSelectedVehicle(vehicle)}
                          >
                            See Details
                          </button>

                          {isAdmin ? (
                            <>
                              <Link to={`/edit-vehicle/${vehicle._id}`}>
                                <button className="primary-btn small-btn">Edit</button>
                              </Link>

                              <button
                                onClick={() => handleDelete(vehicle._id)}
                                className="danger-btn small-btn"
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ textAlign: "center", marginTop: "20px" }}>
                  <h3 style={{ marginTop: 0 }}>No vehicles found</h3>
                  <p>Try updating your filters and search criteria.</p>
                </div>
              )
            )}
        </div>
      </div>

      {selectedVehicle ? (
        <div className="vehicle-modal-overlay" onClick={() => setSelectedVehicle(null)}>
          <div className="card vehicle-modal-card" onClick={(event) => event.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{selectedVehicle.vehicleName}</h2>
            <p style={{ marginTop: 0 }}>{selectedVehicle.type} ({selectedVehicle.category})</p>

            {selectedVehicle.vehicleImage ? (
              <img
                src={selectedVehicle.vehicleImage}
                alt={selectedVehicle.vehicleName}
                className="vehicle-modal-image"
              />
            ) : null}

            <div className="vehicle-meta-grid" style={{ marginTop: "12px" }}>
              <div>
                <span>Price</span>
                <strong>{currencyFormatter.format(Number(selectedVehicle.price || 0))}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedVehicle.status || "-"}</strong>
              </div>
              <div>
                <span>Available Stock</span>
                <strong>{selectedVehicle.stock || 0}</strong>
              </div>
              <div>
                <span>Branch</span>
                <strong>{selectedVehicle.showroomBranch || "Main Branch"}</strong>
              </div>
            </div>

            {selectedVehicle.isRepaired ? (
              <div className="auth-status auth-status-info" style={{ marginTop: "12px" }}>
                Repaired Vehicle: {selectedVehicle.repairedDescription || "Details not provided."}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button type="button" className="primary-btn" onClick={() => setSelectedVehicle(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bookingVehicle ? (
        <div className="vehicle-modal-overlay" onClick={closeBookingModal}>
          <div className="card vehicle-modal-card" onClick={(event) => event.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Book {bookingVehicle.vehicleName}</h2>
            <p style={{ marginTop: 0 }}>Fill customer details to create booking and customer records.</p>

            <form onSubmit={submitBooking} className="booking-inline-form">
              <div>
                <label>Customer Name</label>
                <input
                  type="text"
                  name="customerName"
                  value={bookingForm.customerName}
                  onChange={handleBookingInputChange}
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="customerEmail"
                  value={bookingForm.customerEmail}
                  onChange={handleBookingInputChange}
                />
              </div>

              <div>
                <label>Phone</label>
                <input
                  type="text"
                  name="customerPhone"
                  value={bookingForm.customerPhone}
                  onChange={handleBookingInputChange}
                />
              </div>

              <div>
                <label>Branch</label>
                <input type="text" value={bookingVehicle.showroomBranch || bookingForm.branch} disabled />
              </div>

              <div>
                <label>Booking Date</label>
                <input
                  type="date"
                  name="bookingDate"
                  value={bookingForm.bookingDate}
                  onChange={handleBookingInputChange}
                />
              </div>

              <div className="booking-inline-full">
                <label>Address</label>
                <textarea
                  name="customerAddress"
                  value={bookingForm.customerAddress}
                  onChange={handleBookingInputChange}
                />
              </div>

              <div className="booking-inline-full" style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span className="auth-status auth-status-info" style={{ margin: 0, flex: 1 }}>
                  Amount to pay: {currencyFormatter.format(Number(bookingVehicle.price || 0))}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="ghost-btn" onClick={closeBookingModal} disabled={bookingSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="success-btn" disabled={bookingSubmitting}>
                    {bookingSubmitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}

export default Vehicles;
