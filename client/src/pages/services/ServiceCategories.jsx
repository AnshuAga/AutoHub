import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function ServiceCategories() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const pageBackgroundStyle = {
    minHeight: "100vh",
    overflowX: "hidden",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.28), rgba(7, 23, 38, 0.28)), url("/gallery/service-category.png")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "scroll",
  };

  const contentOverlayStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    margin: "20px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
    backdropFilter: "blur(1px)",
    border: "1px solid rgba(255, 255, 255, 0.45)",
  };

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ name: "", description: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");

  const fetchCategories = async () => {
    try {
      const response = await api.get("/services/categories");
      setCategories(response.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      alert("Only admin can add categories");
      return;
    }

    if (!formData.name || !formData.price) {
      alert("Enter category name and price");
      return;
    }

    try {
      const response = await api.post("/services/categories", formData);
      alert(response.data.message || "Added");
      setFormData({ name: "", description: "", price: "" });
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || "Add failed");
    }
  };

  const handleEditPrice = async (id, newPrice) => {
    if (!isAdmin) {
      alert("Only admin can edit prices");
      return;
    }

    if (!newPrice || newPrice < 0) {
      alert("Enter valid price");
      return;
    }

    try {
      const response = await api.put(`/services/categories/${id}`, { price: Number(newPrice) });
      alert(response.data.message || "Price updated");
      setEditingId(null);
      setEditPrice("");
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || "Update failed");
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    if (!isAdmin) {
      alert("Only admin can manage service status");
      return;
    }

    try {
      const response = await api.put(`/services/categories/${id}`, { isActive: !currentStatus });
      alert(response.data.message || `Service ${!currentStatus ? "enabled" : "disabled"}`);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert("Only admin can delete categories");
      return;
    }

    if (!window.confirm("Delete this category?")) {
      return;
    }

    try {
      const response = await api.delete(`/services/categories/${id}`);
      alert(response.data.message || "Deleted");
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />
      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Service Categories</h1>
          <p style={{ color: "#000000" }}>Manage available service types for repair bookings.</p>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Category Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                disabled={!isAdmin}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                disabled={!isAdmin}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Price (₹)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={(event) => setFormData((current) => ({ ...current, price: event.target.value }))}
                disabled={!isAdmin}
                placeholder="Enter service price"
                min="0"
              />
            </div>

            <button type="submit" className="success-btn" disabled={!isAdmin}>
              Add Category
            </button>
          </form>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {categories.length > 0 ? (
              categories.map((category) => (
                <div
                  key={category._id}
                  style={{
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "20px",
                    backgroundColor: category.isActive ? "#ffffff" : "#f5f5f5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    transition: "all 0.3s ease",
                    opacity: category.isActive ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                    <div>
                      <h3
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        {category.name}
                      </h3>
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "12px",
                          color: "#666",
                          maxHeight: "60px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {category.description || "No description"}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#e3f2fd",
                        borderRadius: "6px",
                        textAlign: "right",
                      }}
                    >
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196F3" }}>
                        ₹{category.price}
                      </div>
                      <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>Price</div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      fontSize: "13px",
                      color: category.isActive ? "#4caf50" : "#f44336",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {category.isActive ? "✓ Active" : "✗ Inactive"}
                  </div>

                  {editingId === category._id ? (
                    <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Enter new price"
                        min="0"
                        style={{
                          flex: 1,
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      />
                      <button
                        onClick={() => handleEditPrice(category._id, editPrice)}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#4caf50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#999",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(category._id);
                            setEditPrice(category.price);
                          }}
                          style={{
                            flex: 1,
                            minWidth: "100px",
                            padding: "10px 12px",
                            backgroundColor: "#0369a1",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "bold",
                            transition: "background-color 0.2s",
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = "#075985")}
                          onMouseOut={(e) => (e.target.style.backgroundColor = "#0369a1")}
                        >
                          ✎ Edit Price
                        </button>

                        <button
                          onClick={() => handleToggleActive(category._id, category.isActive)}
                          style={{
                            flex: 1,
                            minWidth: "100px",
                            padding: "10px 12px",
                            backgroundColor: category.isActive ? "#b45309" : "#047857",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "bold",
                            transition: "background-color 0.2s",
                          }}
                          onMouseOver={(e) =>
                            (e.target.style.backgroundColor = category.isActive ? "#92400e" : "#065f46")
                          }
                          onMouseOut={(e) =>
                            (e.target.style.backgroundColor = category.isActive ? "#b45309" : "#047857")
                          }
                        >
                          {category.isActive ? "⊘ Disable" : "✓ Re-enable"}
                        </button>

                        <button
                          onClick={() => handleDelete(category._id)}
                          style={{
                            flex: 1,
                            minWidth: "100px",
                            padding: "10px 12px",
                            backgroundColor: "#be123c",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "bold",
                            transition: "background-color 0.2s",
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = "#9f1239")}
                          onMouseOut={(e) => (e.target.style.backgroundColor = "#be123c")}
                        >
                          🗑 Delete
                        </button>
                      </>
                    )}
                    {!isAdmin && (
                      <div
                        style={{
                          width: "100%",
                          padding: "10px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "#999",
                        }}
                      >
                        View Only
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "40px",
                  textAlign: "center",
                  color: "#999",
                  fontSize: "16px",
                }}
              >
                No service categories found
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ServiceCategories;
