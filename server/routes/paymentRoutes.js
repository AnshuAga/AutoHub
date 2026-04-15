const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createBookingRazorpayOrder,
  verifyBookingRazorpayPayment,
  addPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");

router.post("/razorpay/order", protect, createBookingRazorpayOrder);
router.post("/razorpay/verify", protect, verifyBookingRazorpayPayment);
router.post("/", protect, addPayment);
router.get("/", protect, getPayments);
router.get("/:id", protect, getPaymentById);
router.put("/:id", protect, updatePayment);
router.delete("/:id", protect, deletePayment);

module.exports = router;