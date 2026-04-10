const mongoose = require("mongoose");

const phoneValidator = {
  validator: (value) => !value || /^\d{10}$/.test(String(value).trim()),
  message: "Phone number must be exactly 10 digits",
};

const serviceBookingSchema = new mongoose.Schema(
  {
    serviceNo: {
      type: String,
      default: undefined,
      trim: true,
      unique: true,
      sparse: true,
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
    customerPhone: {
      type: String,
      default: "",
      trim: true,
      validate: phoneValidator,
    },
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      default: "",
      trim: true,
    },
    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },
    selectedServices: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ServiceCategory",
        },
        serviceName: {
          type: String,
          trim: true,
        },
        price: {
          type: Number,
          default: 0,
        },
      },
    ],
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      default: "",
      trim: true,
    },
    issueDescription: {
      type: String,
      default: "",
      trim: true,
    },
    assignedMechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    assignedMechanicName: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "Pending",
      trim: true,
      enum: ["Pending", "Confirmed", "In Service", "Completed", "Cancelled"],
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      default: "Unpaid",
      trim: true,
      enum: ["Unpaid", "Paid"],
    },
    paymentMethod: {
      type: String,
      default: "",
      trim: true,
    },
    transactionId: {
      type: String,
      default: "",
      trim: true,
    },
    invoiceNo: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ServiceBooking", serviceBookingSchema);