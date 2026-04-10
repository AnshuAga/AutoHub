const User = require("../models/User");
const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { isValidPhoneNumber, normalizePhone } = require("../utils/phone");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const TEAM_ACCOUNT_ROLES = ["admin", "manager", "employee"];
const TEAM_ENRICH_ROLES = ["employee", "manager"];

const normalizeEnvValue = (value) => (typeof value === "string" ? value.trim() : value);
const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : email);

const enrichUserWithEmployeeMeta = async (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (!TEAM_ENRICH_ROLES.includes(role)) {
    return user;
  }

  const linkedEmployee = await Employee.findOne({ email: normalizeEmail(user.email) }).select(
    "role designation branch"
  );
  const fallbackLinkedEmployee =
    linkedEmployee ||
    (await Employee.findOne({
      name: new RegExp(`^${String(user?.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    }).select("role designation branch"));

  const resolvedEmployee = fallbackLinkedEmployee;

  if (!resolvedEmployee) {
    user.employeeRole = "";
    return user;
  }

  user.employeeRole = resolvedEmployee.role || "";

  if (!String(user.branch || "").trim() && resolvedEmployee.branch) {
    user.branch = resolvedEmployee.branch;
  }

  if (role === "employee") {
    const currentDesignation = String(user.designation || "").toLowerCase().trim();
    if (!currentDesignation || currentDesignation === "employee") {
      user.designation = resolvedEmployee.role || resolvedEmployee.designation || user.designation;
    }
  }

  return user;
};

const getEmailTransporter = () => {
  const SMTP_HOST = normalizeEnvValue(process.env.SMTP_HOST);
  const SMTP_PORT = normalizeEnvValue(process.env.SMTP_PORT);
  const SMTP_USER = normalizeEnvValue(process.env.SMTP_USER);
  const SMTP_PASS = normalizeEnvValue(process.env.SMTP_PASS);

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP credentials are not configured on the server. Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOtpEmail = async ({ to, otp, purpose }) => {
  const transporter = getEmailTransporter();
  const from = normalizeEnvValue(process.env.SMTP_FROM) || normalizeEnvValue(process.env.SMTP_USER);
  const subject = purpose === "register" ? "AutoHub Email Verification OTP" : "AutoHub Login OTP";
  const message =
    purpose === "register"
      ? `Your AutoHub verification OTP is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`
      : `Your AutoHub login OTP is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text: message,
  });
};

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  profileImage: user.profileImage,
  role: user.role,
  designation: user.designation,
  employeeRole: user.employeeRole || "",
  branch: user.branch,
  createdAt: user.createdAt,
});

const createAuthPayload = (user, message) => ({
  message,
  token: createToken(user),
  user: sanitizeUser(user),
});

const getNormalizedRole = (user) => String(user?.role || "").toLowerCase();
const isCustomerAccount = (user) => getNormalizedRole(user) === "customer";
const isTeamAccount = (user) => TEAM_ACCOUNT_ROLES.includes(getNormalizedRole(user));

const getProfile = async (req, res) => {
  try {
    res.status(200).json({ user: sanitizeUser(req.user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, profileImage } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (typeof phone !== "undefined" && !isValidPhoneNumber(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use by another account" });
    }

    req.user.name = String(name).trim();
    req.user.email = normalizedEmail;
    req.user.phone = typeof phone === "string" ? normalizePhone(phone) : "";
    req.user.profileImage = typeof profileImage === "string" ? profileImage : "";

    const updatedUser = await req.user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "currentPassword, newPassword and confirmPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const encodeOAuthState = (payload) => Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodeOAuthState = (stateValue) => {
  if (!stateValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(stateValue, "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const resolveClientSuccessUrl = (stateValue) => {
  const fallback = process.env.CLIENT_OAUTH_SUCCESS_URL || "http://localhost:5173/oauth/success";
  const parsedState = decodeOAuthState(stateValue);
  const originFromState = typeof parsedState?.origin === "string" ? parsedState.origin.trim() : "";

  if (originFromState && LOCAL_ORIGIN_PATTERN.test(originFromState)) {
    return `${originFromState.replace(/\/$/, "")}/oauth/success`;
  }

  return fallback;
};

const buildGoogleAuthUrl = (state) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const buildFacebookAuthUrl = () => {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
  });

  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
};

const sendRegisterOtp = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    let user = await User.findOne({ email: normalizedEmail });

    if (user?.isRegistrationCompleted) {
      return res.status(400).json({ message: "User already exists. Please login." });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    if (!user) {
      const tempPassword = crypto.randomBytes(24).toString("hex");
      const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

      user = await User.create({
        name: name || "Pending User",
        email: normalizedEmail,
        password: hashedTempPassword,
        role: "customer",
        isEmailVerified: false,
        isRegistrationCompleted: false,
        registerOtp: otp,
        registerOtpExpiresAt: otpExpiresAt,
      });
    } else {
      user.name = name || user.name;
      user.registerOtp = otp;
      user.registerOtpExpiresAt = otpExpiresAt;
      await user.save();
    }

    await sendOtpEmail({ to: normalizedEmail, otp, purpose: "register" });

    res.status(200).json({ message: "OTP sent to email successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, otp } = req.body;

    if (!email || !password || !otp || !name) {
      return res.status(400).json({ message: "name, email, password and otp are required" });
    }

    if (!phone || !isValidPhoneNumber(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      return res.status(400).json({
        message: "Please request OTP first",
      });
    }

    if (existingUser.isRegistrationCompleted) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (!existingUser.registerOtp || existingUser.registerOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!existingUser.registerOtpExpiresAt || existingUser.registerOtpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    existingUser.name = name;
    existingUser.email = normalizedEmail;
    existingUser.password = hashedPassword;
    existingUser.phone = normalizePhone(phone);
    existingUser.role = role || "customer";
    existingUser.isEmailVerified = true;
    existingUser.isRegistrationCompleted = true;
    existingUser.registerOtp = "";
    existingUser.registerOtpExpiresAt = null;

    const user = await existingUser.save();

    res.status(201).json(createAuthPayload(user, "User registered successfully"));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isRegistrationCompleted) {
      return res.status(400).json({ message: "Please complete registration first" });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!isCustomerAccount(user)) {
      return res.status(403).json({
        message: "Team accounts must login from Team Login page",
      });
    }

    await enrichUserWithEmployeeMeta(user);
    res.status(200).json(createAuthPayload(user, "Login successful"));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const sendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.isRegistrationCompleted) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isCustomerAccount(user)) {
      return res.status(403).json({ message: "Team accounts must login from Team Login page" });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    const otp = generateOtp();
    user.loginOtp = otp;
    user.loginOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: user.email, otp, purpose: "login" });

    res.status(200).json({ message: "Login OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and otp are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isCustomerAccount(user)) {
      return res.status(403).json({ message: "Team accounts must login from Team Login page" });
    }

    if (!user.loginOtp || user.loginOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.loginOtpExpiresAt || user.loginOtpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    user.loginOtp = "";
    user.loginOtpExpiresAt = null;
    await user.save();

    await enrichUserWithEmployeeMeta(user);
    res.status(200).json(createAuthPayload(user, "Login successful"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const teamLoginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isRegistrationCompleted) {
      return res.status(400).json({ message: "Please complete registration first" });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!isTeamAccount(user)) {
      return res.status(403).json({
        message: "Customer accounts must login from main Login page",
      });
    }

    await enrichUserWithEmployeeMeta(user);
    res.status(200).json(createAuthPayload(user, "Login successful"));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const teamSendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.isRegistrationCompleted) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isTeamAccount(user)) {
      return res.status(403).json({ message: "Customer accounts must login from main Login page" });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    const otp = generateOtp();
    user.loginOtp = otp;
    user.loginOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    await sendOtpEmail({ to: user.email, otp, purpose: "login" });

    res.status(200).json({ message: "Login OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const teamLoginWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and otp are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isTeamAccount(user)) {
      return res.status(403).json({ message: "Customer accounts must login from main Login page" });
    }

    if (!user.loginOtp || user.loginOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.loginOtpExpiresAt || user.loginOtpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    user.loginOtp = "";
    user.loginOtpExpiresAt = null;
    await user.save();

    await enrichUserWithEmployeeMeta(user);
    res.status(200).json(createAuthPayload(user, "Login successful"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const googleAuthStart = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({
        message: "Google OAuth is not configured on the server",
      });
    }

    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin.trim() : "";
    const state = encodeOAuthState({
      origin: requestOrigin,
      provider: "google",
      timestamp: Date.now(),
    });

    res.redirect(buildGoogleAuthUrl(state));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const googleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        message: "Missing Google authorization code",
      });
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(400).json({
        message: tokenData.error_description || "Failed to exchange Google code",
      });
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok || !profileData.email) {
      return res.status(400).json({
        message: "Failed to fetch Google profile",
      });
    }

    let user = await User.findOne({ email: profileData.email.toLowerCase() });

    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        name: profileData.name || "Google User",
        email: profileData.email.toLowerCase(),
        password: hashedPassword,
        role: "customer",
        isEmailVerified: true,
        isRegistrationCompleted: true,
      });
    } else if (!user.isEmailVerified || !user.isRegistrationCompleted) {
      user.isEmailVerified = true;
      user.isRegistrationCompleted = true;
      await user.save();
    }

    const payload = createAuthPayload(user, "Google login successful");
    const clientRedirectUrl = resolveClientSuccessUrl(state);

    const redirectUrl = `${clientRedirectUrl}?token=${encodeURIComponent(payload.token)}`;

    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const facebookAuthStart = async (req, res) => {
  try {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_REDIRECT_URI) {
      return res.status(500).json({
        message: "Facebook OAuth is not configured on the server",
      });
    }

    res.redirect(buildFacebookAuthUrl());
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const facebookAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        message: "Missing Facebook authorization code",
      });
    }

    const tokenParams = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      code,
    });

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(400).json({
        message: tokenData.error?.message || "Failed to exchange Facebook code",
      });
    }

    const profileResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(
        tokenData.access_token
      )}`
    );
    const profileData = await profileResponse.json();

    if (!profileResponse.ok || !profileData.email) {
      return res.status(400).json({
        message: "Unable to fetch Facebook email. Ensure email permission is granted.",
      });
    }

    let user = await User.findOne({ email: profileData.email.toLowerCase() });

    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        name: profileData.name || "Facebook User",
        email: profileData.email.toLowerCase(),
        password: hashedPassword,
        role: "customer",
        isEmailVerified: true,
        isRegistrationCompleted: true,
      });
    } else if (!user.isEmailVerified || !user.isRegistrationCompleted) {
      user.isEmailVerified = true;
      user.isRegistrationCompleted = true;
      await user.save();
    }

    const payload = createAuthPayload(user, "Facebook login successful");
    const clientRedirectUrl = process.env.CLIENT_OAUTH_SUCCESS_URL || "http://localhost:5173/oauth/success";

    const redirectUrl = `${clientRedirectUrl}?token=${encodeURIComponent(payload.token)}`;

    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
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
  googleAuthStart,
  googleAuthCallback,
  facebookAuthStart,
  facebookAuthCallback,
};