const mongoose = require("mongoose");

const phoneValidator = {
  validator: (value) => /^\d{10}$/.test(String(value).trim()),
  message: "Phone number must be exactly 10 digits",
};

const employeeSchema = new mongoose.Schema(
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

    designation: {
      type: String,
      required: true,
      trim: true,
      enum: ["Employee", "Branch Manager", "Junior Manager"],
    },

    role: {
      type: String,
      default: "",
      trim: true,
      enum: ["", "Mechanic", "Sales Person", "Receptionist", "Delivery Man", "Other"],
    },

    branch: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    salary: {
      type: Number,
      required: true,
    },

    employeeImage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema);