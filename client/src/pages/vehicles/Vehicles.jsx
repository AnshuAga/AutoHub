import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

const getTodayDate = () => new Date().toISOString().split("T")[0];
const BRAND_OPTIONS = ["Audi", "Mercedes", "Toyota", "Hyundai", "Hero", "Yamaha"];

const getVariantStocks = (vehicle) => (Array.isArray(vehicle?.variantStocks) ? vehicle.variantStocks : []);

const getResolvedVariantOptions = (vehicle) => {
  const options =
    Array.isArray(vehicle?.variantOptions) && vehicle.variantOptions.length > 0
      ? vehicle.variantOptions
      : (vehicle?.variant ? [vehicle.variant] : []);

  if (options.length > 0) {
    return options;
  }

  const variantStocks = getVariantStocks(vehicle);
  return variantStocks.map((entry) => entry.variant).filter(Boolean);
};

const getVariantAvailableStock = (vehicle, variantName) => {
  const variantStocks = getVariantStocks(vehicle);
  if (variantStocks.length === 0) {
    return Number(vehicle?.stock || 0);
  }

  const target = String(variantName || "").trim().toLowerCase();
  const matched = variantStocks.find(
    (entry) => String(entry?.variant || "").trim().toLowerCase() === target
  );

  return Number(matched?.stock || 0);
};

const getFirstBookableVariant = (vehicle) => {
  const variants = getResolvedVariantOptions(vehicle);
  return variants.find((variantName) => getVariantAvailableStock(vehicle, variantName) > 0) || "";
};

const hasBookableVariant = (vehicle) => {
  const variantStocks = getVariantStocks(vehicle);
  if (variantStocks.length === 0) {
    return true;
  }

  return getResolvedVariantOptions(vehicle).some(
    (variantName) => getVariantAvailableStock(vehicle, variantName) > 0
  );
};

function Vehicles() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = (user?.role || "customer").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "branch manager";
  const canViewStockInsights = isAdmin || isManager;
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
  const [brand, setBrand] = useState("");
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
    vehicleVariant: "",
    vehicleColor: "",
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
        brand: customFilters.brand ?? brand,
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
    const variants = getResolvedVariantOptions(vehicle);
    const colors = Array.isArray(vehicle.colorOptions) && vehicle.colorOptions.length > 0
      ? vehicle.colorOptions
      : (vehicle.modelColor ? [vehicle.modelColor] : []);
    const defaultVariant = getFirstBookableVariant(vehicle) || variants[0] || "";

    setBookingVehicle(vehicle);
    setBookingForm((previous) => ({
      ...previous,
      customerName: user?.name || previous.customerName,
      customerEmail: user?.email || previous.customerEmail,
      customerPhone: user?.phone || previous.customerPhone,
      bookingDate: getTodayDate(),
      branch: vehicle.showroomBranch || "Main Branch",
      vehicleVariant: defaultVariant,
      vehicleColor: colors[0] || "",
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

    const selectedVariantStock = getVariantAvailableStock(bookingVehicle, bookingForm.vehicleVariant);
    if (getVariantStocks(bookingVehicle).length > 0 && selectedVariantStock <= 0) {
      alert("Selected variant is out of stock. Please choose another variant.");
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
        vehicleType: bookingVehicle.category,
        vehicleCategory: bookingVehicle.category,
        vehicleVariant: bookingForm.vehicleVariant,
        vehicleColor: bookingForm.vehicleColor,
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
    const activeFilters = {
      q: searchTerm,
      brand,
      category,
      status,
    };

    setLoading(true);
    const timer = setTimeout(() => {
      fetchVehicles(activeFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, brand, category, status]);

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

  const stockSummary = useMemo(() => {
    return sortedVehicles.reduce(
      (summary, vehicle) => {
        summary.available += Number(vehicle.stock || 0);
        summary.incoming += Number(vehicle.incomingStock || 0);
        return summary;
      },
      { available: 0, incoming: 0 }
    );
  }, [sortedVehicles]);

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
          {canViewStockInsights ? (
            <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              <div className="card" style={{ margin: 0 }}>
                <strong>Available Stock</strong>
                <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800 }}>{stockSummary.available}</p>
              </div>
              <div className="card" style={{ margin: 0 }}>
                <strong>Incoming Stock</strong>
                <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800 }}>{stockSummary.incoming}</p>
              </div>
            </div>
          ) : null}
          <div style={{ marginTop: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search by name, brand or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "280px",
                  padding: "10px",
                }}
              />
              <select value={brand} onChange={(e) => setBrand(e.target.value)} style={{ width: "180px" }}>
                <option value="">All Brands</option>
                {BRAND_OPTIONS.map((brandName) => (
                  <option key={brandName} value={brandName}>{brandName}</option>
                ))}
              </select>
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
                    const isVehicleAvailable =
                      vehicle.status === "Available" && Number(vehicle.stock || 0) > 0 && hasBookableVariant(vehicle);
                    const statusToken = String(vehicle.status || "unknown").toLowerCase().replace(/\s+/g, "-");
                    const primaryVehicleImage = vehicle.vehicleImage || (Array.isArray(vehicle.vehicleImages) ? vehicle.vehicleImages[0] : "");

                    return (
                      <article key={vehicle._id} className="card vehicle-card vehicle-card-compact">
                        <div className="vehicle-card-topline">
                          <div className="vehicle-card-thumb">
                            {primaryVehicleImage ? (
                              <img
                                src={primaryVehicleImage}
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
                              {(vehicle.category || "Vehicle").toUpperCase()}
                              {vehicle.brand ? ` • ${vehicle.brand}` : ""}
                            </p>
                            {vehicle.variant || vehicle.modelColor ? (
                              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#555" }}>
                                {vehicle.variant ? `Variant: ${vehicle.variant}` : ""}
                                {vehicle.variant && vehicle.modelColor ? " • " : ""}
                                {vehicle.modelColor ? `Color: ${vehicle.modelColor}` : ""}
                              </p>
                            ) : null}
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
                              {canViewStockInsights ? (
                                <span className="auth-status auth-status-info" style={{ margin: 0, padding: "2px 8px", fontSize: "12px" }}>
                                  Incoming: {vehicle.incomingStock || 0}
                                </span>
                              ) : null}
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
            <p style={{ marginTop: 0 }}>{selectedVehicle.category}</p>

            {(Array.isArray(selectedVehicle.vehicleImages) && selectedVehicle.vehicleImages.length > 0) || selectedVehicle.vehicleImage ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
                {(
                  Array.isArray(selectedVehicle.vehicleImages) && selectedVehicle.vehicleImages.length > 0
                    ? selectedVehicle.vehicleImages
                    : [selectedVehicle.vehicleImage]
                ).filter(Boolean).map((imageSrc, index) => (
                  <img
                    key={`${selectedVehicle._id || "vehicle"}-${index}`}
                    src={imageSrc}
                    alt={`${selectedVehicle.vehicleName} ${index + 1}`}
                    className="vehicle-modal-image"
                    style={{ margin: 0, height: "120px" }}
                  />
                ))}
              </div>
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
              {canViewStockInsights ? (
                <div>
                  <span>Incoming Stock</span>
                  <strong>{selectedVehicle.incomingStock || 0}</strong>
                </div>
              ) : null}
              <div>
                <span>Branch</span>
                <strong>{selectedVehicle.showroomBranch || "Main Branch"}</strong>
              </div>
              <div>
                <span>All Variants</span>
                <strong>
                  {getResolvedVariantOptions(selectedVehicle).length > 0
                    ? getResolvedVariantOptions(selectedVehicle)
                      .map((variantName) => `${variantName} (${getVariantAvailableStock(selectedVehicle, variantName)})`)
                      .join(", ")
                    : "-"}
                </strong>
              </div>
              <div>
                <span>All Colors</span>
                <strong>
                  {Array.isArray(selectedVehicle.colorOptions) && selectedVehicle.colorOptions.length > 0
                    ? selectedVehicle.colorOptions.join(", ")
                    : (selectedVehicle.modelColor || "-")}
                </strong>
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
                <label>Variant</label>
                <select
                  name="vehicleVariant"
                  value={bookingForm.vehicleVariant}
                  onChange={handleBookingInputChange}
                >
                  {(getResolvedVariantOptions(bookingVehicle).length > 0
                    ? getResolvedVariantOptions(bookingVehicle)
                    : ["Standard"]
                  ).map((variantName) => {
                    const availableStock = getVariantAvailableStock(bookingVehicle, variantName);
                    const isOutOfStock = getVariantStocks(bookingVehicle).length > 0 && availableStock <= 0;
                    return (
                      <option key={variantName} value={variantName} disabled={isOutOfStock}>
                        {isOutOfStock ? `${variantName} (Out of stock)` : `${variantName} (${availableStock} left)`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label>Color</label>
                <select
                  name="vehicleColor"
                  value={bookingForm.vehicleColor}
                  onChange={handleBookingInputChange}
                >
                  {((bookingVehicle.colorOptions && bookingVehicle.colorOptions.length > 0)
                    ? bookingVehicle.colorOptions
                    : (bookingVehicle.modelColor ? [bookingVehicle.modelColor] : ["Standard"])
                  ).map((colorName) => (
                    <option key={colorName} value={colorName}>{colorName}</option>
                  ))}
                </select>
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
