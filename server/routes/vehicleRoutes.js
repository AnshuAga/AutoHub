const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  addVehicle,
  getVehicles,
  getVehicleById,
  deleteVehicle,
  updateVehicle,
  assignVehicle,
  unassignVehicle,
  getAssignedVehicles,
} = require("../controllers/vehicleController");

router.post("/", protect, addVehicle);
router.get("/", protect, getVehicles);
router.get("/assigned/mine", protect, getAssignedVehicles);
router.post("/:vehicleId/assign", protect, assignVehicle);
router.post("/:vehicleId/unassign", protect, unassignVehicle);
router.get("/:id", protect, getVehicleById);
router.delete("/:id", protect, deleteVehicle);
router.put("/:id", protect, updateVehicle);

module.exports = router;