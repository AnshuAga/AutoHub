import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function Deliveries() {
  const user = JSON.parse(localStorage.getItem("user"));
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
  const isDeliveryMan = staffRole === "delivery man";
  const isBranchManager =
    normalizedRole === "manager" ||
    staffRole === "branch manager" ||
    normalizedDesignation === "branch manager" ||
    employeeRole === "branch manager";

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/delievery.png")',
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

  const [deliveries, setDeliveries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [markingDelivered, setMarkingDelivered] = useState(null);
  const [deliveryMen, setDeliveryMen] = useState([]);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState(null);
  const [assignmentDeliveryManId, setAssignmentDeliveryManId] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assigningDeliveryId, setAssigningDeliveryId] = useState("");

  useEffect(() => {
    const fetchDeliveryMen = async () => {
      if (!(normalizedRole === "admin" || isBranchManager)) {
        return;
      }

      try {
        const response = await api.get("/deliveries/delivery-men");
        setDeliveryMen(response.data || []);
      } catch (error) {
        console.log(error);
      }
    };

    fetchDeliveryMen();
  }, [normalizedRole, isBranchManager]);

  const fetchDeliveries = async () => {
  try {
    let url = "/deliveries";
    let params = {
      q: searchTerm,
      status,
    };
    
    // If delivery man, fetch their assigned deliveries
    if (isDeliveryMan) {
      url = "/deliveries/my-deliveries";
      params = {}; // No filters for personal deliveries
    }
    
    const response = await api.get(url, { params });
    setDeliveries(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this delivery?");
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.delete(`/deliveries/${id}`);
      alert(response.data.message);
      fetchDeliveries();
    } catch (error) {
      console.log(error);
    }
  };

  const handleMarkDelivered = async (deliveryId) => {
    try {
      setMarkingDelivered(deliveryId);
      const response = await api.post(`/deliveries/${deliveryId}/mark-delivered`);
      alert(response.data.message);
      fetchDeliveries();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to mark delivery as delivered");
    } finally {
      setMarkingDelivered(null);
    }
  };

  const handleAssignDeliveryMan = async (deliveryId) => {
    setAssignmentTarget(deliveries.find((item) => item._id === deliveryId) || null);
    setAssignmentDeliveryManId(deliveries.find((item) => item._id === deliveryId)?.assignedDeliveryMan?._id || deliveries.find((item) => item._id === deliveryId)?.assignedDeliveryMan || "");
    setAssignmentError("");
    setAssignmentModalOpen(true);
  };

  const closeAssignmentModal = () => {
    setAssignmentModalOpen(false);
    setAssignmentTarget(null);
    setAssignmentDeliveryManId("");
    setAssignmentError("");
    setAssigningDeliveryId("");
  };

  const submitAssignment = async () => {
    if (!assignmentTarget) {
      return;
    }

    try {
      setAssigningDeliveryId(assignmentTarget._id);
      setAssignmentError("");
      await api.post(`/deliveries/${assignmentTarget._id}/assign-delivery-man`, {
        assignToEmployeeId: assignmentDeliveryManId,
      });
      closeAssignmentModal();
      fetchDeliveries();
    } catch (error) {
      setAssignmentError(error.response?.data?.message || "Assign failed");
    } finally {
      setAssigningDeliveryId("");
    }
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Deliveries</h1>
          <div style={{ marginTop: "20px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder={isDeliveryMan ? "Search in your deliveries..." : (isCustomer ? "Search by vehicle, status or branch..." : "Search by customer, vehicle or branch...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "300px" }}
            disabled={isDeliveryMan}
          />
          {!isDeliveryMan && (
            <>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "180px", marginLeft: "10px" }}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
              </select>
              <button className="primary-btn small-btn" style={{ marginLeft: "10px" }} onClick={() => {
                setLoading(true);
                fetchDeliveries();
              }}>
                Search
              </button>
            </>
          )}
        </div>
        {loading ? (
            <p>Loading deliveries...</p>
          ) : (

          <table border="1" cellPadding="6" style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th>{isCustomer ? "ID" : "Booking No"}</th>
                <th>{isCustomer ? "Vehicle" : "Customer Name"}</th>
                <th>Vehicle Name</th>
                <th>Delivery Date</th>
                <th>Status</th>
                {!isDeliveryMan && !isCustomer && <th>Assigned Delivery Man</th>}
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
  {deliveries.length > 0 ? (
    deliveries.map((delivery, index) => (
      <tr key={delivery._id}>
        <td>{isCustomer ? index + 1 : delivery.bookingNo || delivery.bookingId?.slice(-6) || "-"}</td>
        <td>{isCustomer ? delivery.vehicleName : delivery.customerName}</td>
        <td>{delivery.vehicleName}</td>
        <td>{new Date(delivery.deliveryDate).toLocaleDateString()}</td>
        <td>{delivery.status}</td>
        {!isDeliveryMan && !isCustomer && (
          <td>{delivery.assignedDeliveryMan?.name || "Not Assigned"}</td>
        )}
        <td>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {isDeliveryMan && delivery.status !== "Delivered" && (
              <button 
                className="success-btn small-btn"
                onClick={() => handleMarkDelivered(delivery._id)}
                disabled={markingDelivered === delivery._id}
              >
                {markingDelivered === delivery._id ? "Marking..." : "Mark Complete"}
              </button>
            )}
            {(normalizedRole === "admin" || isBranchManager) && delivery.status !== "Delivered" && (
              <button
                className="success-btn small-btn"
                onClick={() => handleAssignDeliveryMan(delivery._id)}
                disabled={assigningDeliveryId === delivery._id || deliveryMen.length === 0}
              >
                {assigningDeliveryId === delivery._id ? "Assigning..." : "Assign"}
              </button>
            )}
            {!isDeliveryMan && (
              <>
                <Link to={`/edit-delivery/${delivery._id}`}>
                  <button className="primary-btn small-btn">Edit</button>
                </Link>
                {!isCustomer ? (
                  <button className="danger-btn small-btn" onClick={() => handleDelete(delivery._id)}>
                    Delete
                  </button>
                ) : null}
              </>
            )}
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={isDeliveryMan || isCustomer ? 7 : 8} style={{ textAlign: "center" }}>
        No deliveries found
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
            <h3 style={{ marginTop: 0 }}>Assign delivery man</h3>
            <p style={{ marginTop: 0, color: "#5b6472" }}>
              {assignmentTarget.bookingNo || assignmentTarget._id?.slice(-6) || "Delivery"}
            </p>

            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Delivery man</label>
            <select
              value={assignmentDeliveryManId}
              onChange={(event) => setAssignmentDeliveryManId(event.target.value)}
              style={{ width: "100%", marginBottom: "10px" }}
            >
              <option value="">Not Assigned</option>
              {deliveryMen.map((employee) => (
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

      <Footer />
    </div>
  );
}

export default Deliveries;
