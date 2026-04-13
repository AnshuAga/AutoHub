const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  sendRegisterOtp,
  registerUser,
  loginUser,
  sendLoginOtp,
  loginWithOtp,
  teamLoginUser,
  teamSendLoginOtp,
  teamLoginWithOtp,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleAuthStart,
  googleAuthCallback,
  facebookAuthStart,
  facebookAuthCallback,
} = require("../controllers/authController");

router.post("/send-register-otp", sendRegisterOtp);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-login-otp", sendLoginOtp);
router.post("/login-with-otp", loginWithOtp);
router.post("/team/login", teamLoginUser);
router.post("/team/send-login-otp", teamSendLoginOtp);
router.post("/team/login-with-otp", teamLoginWithOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.get("/google/start", googleAuthStart);
router.get("/google/callback", googleAuthCallback);
router.get("/facebook/start", facebookAuthStart);
router.get("/facebook/callback", facebookAuthCallback);

module.exports = router;