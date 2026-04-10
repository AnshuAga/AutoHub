import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function Customers() {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/Customer.png")',
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

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

 const fetchCustomers = async () => {
  try {
    const response = await api.get("/customers", {
      params: {
        q: searchTerm,
      },
    });
    setCustomers(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchCustomers();
  }, []);
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this customer record?");
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.delete(`/customers/${id}`);
      alert(response.data.message);
      fetchCustomers();
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
          <h1>Customers</h1>
           <div style={{ marginTop: "20px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "300px" }}
            />
            <button className="primary-btn small-btn" style={{ marginLeft: "10px" }} onClick={() => {
              setLoading(true);
              fetchCustomers();
            }}>
              Search
            </button>
          </div>
          {loading ? (
            <p>Loading customers...</p>
          ) : (
          <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Registration No</th>
                {isAdmin ? <th>Booking No</th> : null}
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
  {customers.length > 0 ? (
    customers.map((customer) => (
      <tr key={customer._id}>
        <td>{customer.registrationNo || "-"}</td>
        {isAdmin ? <td>{customer.bookingNo || "-"}</td> : null}
        <td>{customer.name}</td>
        <td>{customer.email}</td>
        <td>{customer.phone}</td>
        <td>{customer.branch || "-"}</td>
        <td>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to={`/edit-customer/${customer._id}`}>
              <button className="primary-btn small-btn">Edit</button>
            </Link>
            <button className="danger-btn small-btn" onClick={() => handleDelete(customer._id)}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: "center" }}>
        No customers found
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

export default Customers;
