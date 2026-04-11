const mongoose = require("mongoose");

const variantStockSchema = new mongoose.Schema(
  {
    variant: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: "car",
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    modelYear: {
      type: Number,
      default: null,
    },

    modelColor: {
      type: String,
      default: "",
      trim: true,
    },

    variant: {
      type: String,
      default: "",
      trim: true,
    },

    variantOptions: {
      type: [String],
      default: [],
    },

    variantStocks: {
      type: [variantStockSchema],
      default: [],
    },

    colorOptions: {
      type: [String],
      default: [],
    },

    showroomBranch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    stock: {
      type: Number,
      default: 1,
    },

    incomingStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      default: "Available",
      trim: true,
    },

    isRepaired: {
      type: Boolean,
      default: false,
    },

    repairedDescription: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    vehicleImage: {
      type: String,
      default: "",
      trim: true,
    },

    vehicleImages: {
      type: [String],
      default: [],
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    assignmentType: {
      type: String,
      trim: true,
      enum: ["Repair", "Delivery", null],
      default: null,
    },

    assignedDate: {
      type: Date,
      default: null,
    },

    assignmentNotes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);