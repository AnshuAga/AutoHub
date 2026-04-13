const mongoose = require("mongoose");

const phoneValidator = {
  validator: (value) => !value || /^\d{10}$/.test(String(value).trim()),
  message: "Phone number must be exactly 10 digits",
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      validate: phoneValidator,
    },

    profileImage: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "customer", "employee", "manager"],
      default: "customer",
    },

    designation: {
      type: String,
      default: "",
      trim: true,
    },

    branch: {
      type: String,
      default: "",
      trim: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isRegistrationCompleted: {
      type: Boolean,
      default: false,
    },

    registerOtp: {
      type: String,
      default: "",
    },

    registerOtpExpiresAt: {
      type: Date,
      default: null,
    },

    loginOtp: {
      type: String,
      default: "",
    },

    loginOtpExpiresAt: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: "",
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);