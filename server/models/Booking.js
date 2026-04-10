const mongoose = require("mongoose");

const phoneValidator = {
  validator: (value) => !value || /^\d{10}$/.test(String(value).trim()),
  message: "Phone number must be exactly 10 digits",
};

const bookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    bookingNo: {
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

    customerAddress: {
      type: String,
      default: "",
      trim: true,
    },

    customerRegistrationNo: {
      type: String,
      default: "",
      trim: true,
    },

    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },

    vehicleType: {
      type: String,
      default: "",
      trim: true,
    },

    vehicleCategory: {
      type: String,
      default: "",
      trim: true,
    },

    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      default: "Pending",
      trim: true,
    },

    paymentStatus: {
      type: String,
      default: "Unpaid",
      trim: true,
    },

    paymentMethod: {
      type: String,
      default: "",
      trim: true,
    },

    amount: {
      type: Number,
      default: null,
    },

    cardLast4: {
      type: String,
      default: "",
      trim: true,
    },

    transactionId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);