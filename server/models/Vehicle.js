const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
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

    showroomBranch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    stock: {
      type: Number,
      default: 1,
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