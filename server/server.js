const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const vehicleRoutes = require("./routes/vehicleRoutes");
const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
dotenv.config();

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "SMTP_PASS"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://auto-hub-theta.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => console.log(error));

const authRoutes = require("./routes/authRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/services", serviceRoutes);
app.get("/", (req, res) => {
  res.send("AutoHub Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});