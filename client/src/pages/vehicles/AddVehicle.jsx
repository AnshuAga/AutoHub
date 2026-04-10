import { useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function AddVehicle() {
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
    vehicleImage: "",
  });
  const [imagePreview, setImagePreview] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleName || !formData.type || !formData.price) {
      alert("Please fill all fields");
      return;
    }

    try {
      const response = await api.post("/vehicles", formData);

      alert(response.data.message);

      setFormData({
        vehicleName: "",
        type: "",
        category: "car",
        showroomBranch: "Main Branch",
        stock: 1,
        status: "Available",
        isRepaired: false,
        repairedDescription: "",
        price: "",
        vehicleImage: "",
      });
      setImagePreview("");
    } catch (error) {
      alert(error.response.data.message);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      setImagePreview(imageData);
      setFormData((current) => ({
        ...current,
        vehicleImage: imageData,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Add Vehicle</h1>

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
              <label>Vehicle Image</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>

            {imagePreview ? (
              <div style={{ marginBottom: "15px" }}>
                <img
                  src={imagePreview}
                  alt="Vehicle preview"
                  style={{ width: "100%", maxWidth: "260px", borderRadius: "12px", objectFit: "cover" }}
                />
              </div>
            ) : null}

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

            <button type="submit" className="success-btn">
              Add Vehicle
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default AddVehicle;
