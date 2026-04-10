const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  addPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");

router.post("/", protect, addPayment);
router.get("/", protect, getPayments);
router.get("/:id", protect, getPaymentById);
router.put("/:id", protect, updatePayment);
router.delete("/:id", protect, deletePayment);

module.exports = router;