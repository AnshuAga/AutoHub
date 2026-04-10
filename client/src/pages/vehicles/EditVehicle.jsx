import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function EditVehicle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vehicleName: "",
    type: "",
    category: "car",
    showroomBranch: "Main Branch",
    stock: 1,
    status: "Available",
    isRepaired: false,
    repairedDescription: "",
    price: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchVehicle = async () => {
    try {
      const response = await api.get(`/vehicles/${id}`);

      const vehicle = response.data;

      if (vehicle) {
        setFormData({
          vehicleName: vehicle.vehicleName,
          type: vehicle.type,
          category: vehicle.category || "car",
          showroomBranch: vehicle.showroomBranch || "Main Branch",
          stock: vehicle.stock ?? 1,
          status: vehicle.status || "Available",
          isRepaired: Boolean(vehicle.isRepaired),
          repairedDescription: vehicle.repairedDescription || "",
          price: vehicle.price,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.put(`/vehicles/${id}`, formData);

      alert(response.data.message);
      navigate("/vehicles");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, []);

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Edit Vehicle</h1>

          <form onSubmit={handleSubmit} className="form-container">
            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle Name</label>
              <input
                type="text"
                name="vehicleName"
                value={formData.vehicleName}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Type</label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Showroom Branch</label>
              <select name="showroomBranch" value={formData.showroomBranch} onChange={handleChange}>
                <option value="Main Branch">Main Branch</option>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Stock</label>
              <input type="number" name="stock" min="0" value={formData.stock} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Sold">Sold</option>
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="isRepaired"
                  checked={formData.isRepaired}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isRepaired: e.target.checked,
                    })
                  }
                />
                Repaired Vehicle
              </label>
            </div>

            {formData.isRepaired && (
              <div style={{ marginBottom: "15px" }}>
                <label>Repair Description</label>
                <textarea
                  name="repairedDescription"
                  value={formData.repairedDescription}
                  onChange={handleChange}
                />
              </div>
            )}

            <button type="submit" className="primary-btn">
              Update Vehicle
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default EditVehicle;