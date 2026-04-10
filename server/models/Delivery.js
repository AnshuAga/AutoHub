const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    bookingNo: {
      type: String,
      default: "",
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },

    assignedDeliveryMan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    deliveryDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      default: "Pending",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Delivery", deliverySchema);