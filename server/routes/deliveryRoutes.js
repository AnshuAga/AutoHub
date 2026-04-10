const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  addDelivery,
  getDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
  getDeliveryMen,
  assignDeliveryMan,
  markDeliveryAsDelivered,
  getMyDeliveries,
} = require("../controllers/deliveryController");

router.post("/", protect, addDelivery);
router.get("/", protect, getDeliveries);
router.get("/my-deliveries", protect, getMyDeliveries);
router.get("/delivery-men", protect, getDeliveryMen);
router.post("/:deliveryId/assign-delivery-man", protect, assignDeliveryMan);
router.post("/:deliveryId/mark-delivered", protect, markDeliveryAsDelivered);
router.get("/:id", protect, getDeliveryById);
router.put("/:id", protect, updateDelivery);
router.delete("/:id", protect, deleteDelivery);

module.exports = router;