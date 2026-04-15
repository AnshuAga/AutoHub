const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
    },

    method: {
      type: String,
      required: true,
      trim: true,
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

    gatewayOrderId: {
      type: String,
      default: "",
      trim: true,
    },

    gatewayPaymentId: {
      type: String,
      default: "",
      trim: true,
    },

    gatewaySignature: {
      type: String,
      default: "",
      trim: true,
    },

    gatewayName: {
      type: String,
      default: "Razorpay",
      trim: true,
    },

    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    status: {
      type: String,
      default: "Pending",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      transactionId: { $exists: true, $nin: [null, ""] },
    },
  }
);

module.exports = mongoose.model("Payment", paymentSchema);