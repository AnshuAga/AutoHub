const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getServiceCategories,
  addServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getServiceMechanics,
  createServiceRazorpayOrder,
  verifyServiceRazorpayPayment,
  addServiceBooking,
  getServiceBookings,
  getServiceBookingById,
  updateServiceBooking,
  assignServiceBookingToSelf,
  deleteServiceBooking,
} = require("../controllers/serviceController");

router.get("/categories", protect, getServiceCategories);
router.post("/categories", protect, addServiceCategory);
router.put("/categories/:id", protect, updateServiceCategory);
router.delete("/categories/:id", protect, deleteServiceCategory);

router.get("/mechanics", protect, getServiceMechanics);

router.post("/payments/razorpay/order", protect, createServiceRazorpayOrder);
router.post("/payments/razorpay/verify", protect, verifyServiceRazorpayPayment);

router.post("/bookings", protect, addServiceBooking);
router.get("/bookings", protect, getServiceBookings);
router.get("/bookings/:id", protect, getServiceBookingById);
router.put("/bookings/:id", protect, updateServiceBooking);
router.put("/bookings/:id/assign-self", protect, assignServiceBookingToSelf);
router.delete("/bookings/:id", protect, deleteServiceBooking);

module.exports = router;