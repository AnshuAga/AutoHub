const mongoose = require("mongoose");

const phoneValidator = {
  validator: (value) => /^\d{10}$/.test(String(value).trim()),
  message: "Phone number must be exactly 10 digits",
};

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      validate: phoneValidator,
    },

    registrationNo: {
      type: String,
      default: undefined,
      trim: true,
      unique: true,
      sparse: true,
    },

    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Customer", customerSchema);