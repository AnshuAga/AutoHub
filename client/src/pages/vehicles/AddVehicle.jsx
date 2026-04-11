import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

const BRAND_OPTIONS = ["Audi", "Mercedes", "Toyota", "Hyundai", "Hero", "Yamaha"];

const getTotalVariantStock = (variantStocks = []) =>
  variantStocks.reduce((total, entry) => total + Number(entry?.stock || 0), 0);

function AddVehicle() {
  const navigate = useNavigate();
  const imageInputRef = useRef(null);
  const [formData, setFormData] = useState({
    vehicleName: "",
    brand: "",
    modelColor: "",
    variant: "",
    colorOptions: [],
    variantOptions: [],
    variantStocks: [],
    category: "car",
    showroomBranch: "Main Branch",
    stock: 1,
    incomingStock: 0,
    isRepaired: false,
    repairedDescription: "",
    price: "",
    vehicleImage: "",
    vehicleImages: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [colorOptionInput, setColorOptionInput] = useState("");
  const [variantOptionInput, setVariantOptionInput] = useState("");

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleName || !formData.price) {
      alert("Please fill all fields");
      return;
    }

    const payload = {
      ...formData,
      modelColor: formData.modelColor || formData.colorOptions[0] || "",
      variant: formData.variant || formData.variantOptions[0] || "",
      variantStocks: formData.variantStocks,
      stock: formData.variantStocks.length > 0 ? getTotalVariantStock(formData.variantStocks) : Number(formData.stock || 0),
    };

    try {
      const response = await api.post("/vehicles", payload);

      alert(response.data.message);
      navigate("/vehicles");

      setFormData({
        vehicleName: "",
        brand: "",
        modelColor: "",
        variant: "",
        colorOptions: [],
        variantOptions: [],
        variantStocks: [],
        category: "car",
        showroomBranch: "Main Branch",
        stock: 1,
        incomingStock: 0,
        isRepaired: false,
        repairedDescription: "",
        price: "",
        vehicleImage: "",
        vehicleImages: [],
      });
      setImagePreviews([]);
      setColorOptionInput("");
      setVariantOptionInput("");
    } catch (error) {
      alert(error.response.data.message);
    }
  };

  const addOption = (field, selectedField, value) => {
    const item = String(value || "").trim();
    if (!item) {
      return;
    }

    setFormData((current) => {
      if (current[field].includes(item)) {
        return current;
      }

      return {
        ...current,
        [field]: [...current[field], item],
        [selectedField]: current[selectedField] || item,
        variantStocks:
          field === "variantOptions"
            ? [...current.variantStocks, { variant: item, stock: 0 }]
            : current.variantStocks,
      };
    });
  };

  const removeOption = (field, selectedField, value) => {
    setFormData((current) => {
      const nextOptions = current[field].filter((item) => item !== value);
      const nextSelected = current[selectedField] === value ? (nextOptions[0] || "") : current[selectedField];

      return {
        ...current,
        [field]: nextOptions,
        [selectedField]: nextSelected,
        variantStocks:
          field === "variantOptions"
            ? current.variantStocks.filter((entry) => entry.variant !== value)
            : current.variantStocks,
      };
    });
  };

  const handleVariantStockChange = (variantName, value) => {
    const nextStock = Math.max(0, Number(value || 0));
    setFormData((current) => ({
      ...current,
      variantStocks: current.variantStocks.map((entry) =>
        entry.variant === variantName ? { ...entry, stock: nextStock } : entry
      ),
    }));
  };

  const removeImage = (imageToRemove) => {
    setImagePreviews((current) => {
      const nextImages = current.filter((imageSrc) => imageSrc !== imageToRemove);
      setFormData((formCurrent) => ({
        ...formCurrent,
        vehicleImages: nextImages,
        vehicleImage: nextImages[0] || "",
      }));
      return nextImages;
    });
  };

  const setCoverImage = (coverImage) => {
    setImagePreviews((current) => {
      const nextImages = [coverImage, ...current.filter((imageSrc) => imageSrc !== coverImage)];
      setFormData((formCurrent) => ({
        ...formCurrent,
        vehicleImages: nextImages,
        vehicleImage: nextImages[0] || "",
      }));
      return nextImages;
    });
  };

  const handleImageChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const oversizedFile = files.find((file) => file.size > 2 * 1024 * 1024);
    if (oversizedFile) {
      alert("Please upload an image smaller than 2MB");
      return;
    }

    try {
      const encodedImages = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      setImagePreviews(encodedImages);
      setFormData((current) => ({
        ...current,
        vehicleImages: encodedImages,
        vehicleImage: encodedImages[0] || "",
      }));
    } catch (error) {
      alert("Failed to process selected images");
    }
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
              <label>Brand</label>
              <select name="brand" value={formData.brand} onChange={handleChange}>
                <option value="">Select Brand</option>
                {BRAND_OPTIONS.map((brandName) => (
                  <option key={brandName} value={brandName}>{brandName}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Model Color</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={colorOptionInput}
                  onChange={(e) => setColorOptionInput(e.target.value)}
                  placeholder="Add model color"
                />
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={() => {
                    addOption("colorOptions", "modelColor", colorOptionInput);
                    setColorOptionInput("");
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {formData.colorOptions.map((color) => (
                  <span key={color} className="auth-status auth-status-info" style={{ margin: 0 }}>
                    {color}
                    <button
                      type="button"
                      className="ghost-btn small-btn"
                      style={{ marginLeft: "8px" }}
                      onClick={() => removeOption("colorOptions", "modelColor", color)}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              {formData.colorOptions.length > 0 ? (
                <div style={{ marginTop: "8px" }}>
                  <label>Default Model Color</label>
                  <select name="modelColor" value={formData.modelColor} onChange={handleChange}>
                    {formData.colorOptions.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Variant</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={variantOptionInput}
                  onChange={(e) => setVariantOptionInput(e.target.value)}
                  placeholder="Add variant"
                />
                <button
                  type="button"
                  className="ghost-btn small-btn"
                  onClick={() => {
                    addOption("variantOptions", "variant", variantOptionInput);
                    setVariantOptionInput("");
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {formData.variantOptions.map((variantName) => (
                  <span key={variantName} className="auth-status auth-status-info" style={{ margin: 0 }}>
                    {variantName}
                    <button
                      type="button"
                      className="ghost-btn small-btn"
                      style={{ marginLeft: "8px" }}
                      onClick={() => removeOption("variantOptions", "variant", variantName)}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              {formData.variantOptions.length > 0 ? (
                <div style={{ marginTop: "8px" }}>
                  <label>Default Variant</label>
                  <select name="variant" value={formData.variant} onChange={handleChange}>
                    {formData.variantOptions.map((variantName) => (
                      <option key={variantName} value={variantName}>{variantName}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              {formData.variantOptions.length > 0 ? (
                <div style={{ marginTop: "10px" }}>
                  <label>Stock By Variant</label>
                  <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                    {formData.variantOptions.map((variantName) => {
                      const currentStock = formData.variantStocks.find((entry) => entry.variant === variantName)?.stock ?? 0;
                      return (
                        <div key={`${variantName}-stock`} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ minWidth: "120px" }}>{variantName}</span>
                          <input
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={(event) => handleVariantStockChange(variantName, event.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Vehicle Images</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="primary-btn small-btn"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Add Photos
                </button>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Select one or more images. Use Ctrl or Shift to pick multiple files.
                </span>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>

            {imagePreviews.length > 0 ? (
              <div style={{ marginBottom: "15px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px" }}>
                {imagePreviews.map((imageSrc, index) => (
                  <div key={`${index}-${imageSrc.slice(0, 30)}`} style={{ position: "relative" }}>
                    <img
                      src={imageSrc}
                      alt={`Vehicle preview ${index + 1}`}
                      style={{ width: "100%", height: "100px", borderRadius: "10px", objectFit: "cover" }}
                    />
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="ghost-btn small-btn"
                        onClick={() => setCoverImage(imageSrc)}
                        disabled={index === 0}
                      >
                        Make Cover
                      </button>
                      <button
                        type="button"
                        className="danger-btn small-btn"
                        onClick={() => removeImage(imageSrc)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
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
              <input
                type="number"
                name="stock"
                min="0"
                value={formData.variantOptions.length > 0 ? getTotalVariantStock(formData.variantStocks) : formData.stock}
                onChange={handleChange}
                disabled={formData.variantOptions.length > 0}
              />
              {formData.variantOptions.length > 0 ? (
                <small style={{ color: "#64748b" }}>
                  Total stock is auto-calculated from variant stock values.
                </small>
              ) : null}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>Incoming Stock</label>
              <input
                type="number"
                name="incomingStock"
                min="0"
                value={formData.incomingStock}
                onChange={handleChange}
              />
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
