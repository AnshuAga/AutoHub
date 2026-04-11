const mongoose = require("mongoose");

const branchDetailSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    contactEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    managerName: {
      type: String,
      default: "",
      trim: true,
    },
    managerEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BranchDetail", branchDetailSchema);
