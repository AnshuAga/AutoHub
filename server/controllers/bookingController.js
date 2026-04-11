const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const Vehicle = require("../models/Vehicle");
const nodemailer = require("nodemailer");
const { isValidPhoneNumber, normalizePhone } = require("../utils/phone");
const { buildBookingConfirmationTemplate } = require("../utils/emailTemplates");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();
const normalizeEnvValue = (value) => (typeof value === "string" ? value.trim() : value);

const getEmailTransporter = () => {
  const SMTP_HOST = normalizeEnvValue(process.env.SMTP_HOST);
  const SMTP_PORT = normalizeEnvValue(process.env.SMTP_PORT);
  const SMTP_USER = normalizeEnvValue(process.env.SMTP_USER);
  const SMTP_PASS = normalizeEnvValue(process.env.SMTP_PASS);

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP credentials are not configured on the server");
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

const sendBookingConfirmationEmail = async ({ to, booking }) => {
  if (!to) {
    return;
  }

  const transporter = getEmailTransporter();
  const from = normalizeEnvValue(process.env.SMTP_FROM) || normalizeEnvValue(process.env.SMTP_USER);
  const { subject, html, text } = buildBookingConfirmationTemplate({
    name: booking.customerName,
    email: to,
    bookingNo: booking.bookingNo,
    vehicleName: booking.vehicleName,
    vehicleType: booking.vehicleType,
    bookingDate: booking.bookingDate,
    branch: booking.branch,
    paymentStatus: booking.paymentStatus,
    amount: booking.amount,
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const applyBookingBranchScope = (req, filters) => {
  if (!isTeamScopedRole(req)) {
    return { ok: true, filters };
  }

  const userBranch = getRequiredUserBranch(req);
  if (!userBranch) {
    return { ok: false, status: 403, message: "Your account is missing branch mapping" };
  }

  return {
    ok: true,
    filters: {
      ...filters,
      branch: new RegExp(`^${escapeRegex(userBranch)}$`, "i"),
    },
  };
};

const generateRegistrationNo = async () => {
  const today = new Date();
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;

  let sequence = 1;
  while (true) {
    const registrationNo = `CUST-${yyyymmdd}-${String(sequence).padStart(4, "0")}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Customer.exists({ registrationNo });
    if (!exists) {
      return registrationNo;
    }
    sequence += 1;
  }
};

const generateBookingNo = async () => {
  const today = new Date();
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;

  let sequence = 1;
  while (true) {
    const bookingNo = `BKG-${yyyymmdd}-${String(sequence).padStart(4, "0")}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Booking.exists({ bookingNo });
    if (!exists) {
      return bookingNo;
    }
    sequence += 1;
  }
};

const restoreVehicleAvailabilityForBooking = async (booking) => {
  if (!booking?.vehicleId) {
    return;
  }

  const isConfirmed = String(booking.status || "").toLowerCase() === "confirmed";
  if (!isConfirmed) {
    return;
  }

  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (!vehicle) {
    return;
  }

  vehicle.stock = Number(vehicle.stock || 0) + 1;
  if (vehicle.stock > 0) {
    vehicle.status = "Available";
  }

  await vehicle.save();
};

const buildCustomerCascadeQuery = ({ customerId, customerEmail }) => {
  if (customerId) {
    return { customerId };
  }

  if (customerEmail) {
    return { customerEmail: customerEmail.toLowerCase() };
  }

  return null;
};

const cascadeDeleteCustomerBookingsAndPayments = async ({ customerId, customerEmail }) => {
  const query = buildCustomerCascadeQuery({ customerId, customerEmail });
  if (!query) {
    return { deletedBookings: 0 };
  }

  const relatedBookings = await Booking.find(query);
  for (const booking of relatedBookings) {
    await restoreVehicleAvailabilityForBooking(booking);
  }

  const bookingIds = relatedBookings.map((booking) => booking._id);

  if (bookingIds.length > 0) {
    await Payment.deleteMany({ bookingId: { $in: bookingIds } });
    await Booking.deleteMany({ _id: { $in: bookingIds } });
  }

  if (customerId) {
    await Customer.findByIdAndDelete(customerId);
  } else if (customerEmail) {
    await Customer.findOneAndDelete({ email: customerEmail.toLowerCase() });
  }

  return { deletedBookings: bookingIds.length };
};

const buildBookingFilters = (query = {}) => {
  const { q, status, paymentStatus, branch, vehicleType, customerEmail, fromDate, toDate } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [{ customerName: regex }, { vehicleName: regex }];
  }
  if (status) {
    filters.status = new RegExp(`^${escapeRegex(status)}$`, "i");
  }
  if (paymentStatus) {
    filters.paymentStatus = new RegExp(`^${escapeRegex(paymentStatus)}$`, "i");
  }
  if (branch) {
    filters.branch = new RegExp(escapeRegex(branch), "i");
  }
  if (vehicleType) {
    filters.vehicleType = new RegExp(`^${escapeRegex(vehicleType)}$`, "i");
  }
  if (customerEmail) {
    filters.customerEmail = new RegExp(`^${escapeRegex(customerEmail)}$`, "i");
  }
  if (fromDate || toDate) {
    filters.bookingDate = {};
    if (fromDate) {
      filters.bookingDate.$gte = new Date(fromDate);
    }
    if (toDate) {
      filters.bookingDate.$lte = new Date(toDate);
    }
  }

  return filters;
};

const addBooking = async (req, res) => {
  try {
    const {
      customerId,
      vehicleId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerRegistrationNo,
      vehicleName,
      vehicleType,
      vehicleCategory,
      branch,
      bookingDate,
      status,
      paymentStatus,
      paymentMethod,
      amount,
      cardLast4,
      transactionId,
    } = req.body;

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : branch;
    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    if (!customerName || !vehicleName || !bookingDate) {
      return res
        .status(400)
        .json({ message: "customerName, vehicleName and bookingDate are required" });
    }

    if (!customerPhone || !isValidPhoneNumber(customerPhone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    let linkedCustomerId = customerId || null;
    let linkedVehicleId = vehicleId || null;

    const normalizedStatus = String(status || "Pending").toLowerCase();
    const shouldReserveStock = normalizedStatus === "confirmed";

    let linkedVehicle = null;

    if (linkedVehicleId) {
      linkedVehicle = await Vehicle.findById(linkedVehicleId);
    }

    if (!linkedVehicle && vehicleName) {
      const vehicleFilters = {
        vehicleName: new RegExp(`^${escapeRegex(vehicleName)}$`, "i"),
      };

      if (scopedBranch) {
        vehicleFilters.showroomBranch = new RegExp(`^${escapeRegex(scopedBranch)}$`, "i");
      }

      linkedVehicle = await Vehicle.findOne(vehicleFilters).sort({ createdAt: -1 });
    }

    if (linkedVehicle) {
      linkedVehicleId = linkedVehicle._id;
    }

    if (shouldReserveStock && linkedVehicle && Number(linkedVehicle.stock || 0) <= 0) {
      return res.status(400).json({ message: "Vehicle is out of stock" });
    }

    if (customerEmail || customerPhone) {
      const customerQuery = customerEmail
        ? { email: customerEmail.toLowerCase() }
        : { phone: customerPhone };

      const existingCustomer = await Customer.findOne(customerQuery);

      if (existingCustomer) {
        existingCustomer.name = customerName;
        existingCustomer.phone = customerPhone ? normalizePhone(customerPhone) : existingCustomer.phone;
        existingCustomer.address = customerAddress || existingCustomer.address;
        existingCustomer.branch = scopedBranch || existingCustomer.branch;
        existingCustomer.registrationNo = customerRegistrationNo || existingCustomer.registrationNo;
        if (!existingCustomer.registrationNo) {
          existingCustomer.registrationNo = await generateRegistrationNo();
        }
        if (customerEmail) {
          existingCustomer.email = customerEmail.toLowerCase();
        }
        await existingCustomer.save();
        linkedCustomerId = existingCustomer._id;
      } else {
        const createdCustomer = await Customer.create({
          name: customerName,
          email: customerEmail,
          phone: customerPhone ? normalizePhone(customerPhone) : customerPhone,
          address: customerAddress,
          branch: scopedBranch,
          registrationNo: customerRegistrationNo || (await generateRegistrationNo()),
        });

        linkedCustomerId = createdCustomer._id;
      }
    }

    const booking = await Booking.create({
      bookingNo: await generateBookingNo(),
      customerId: linkedCustomerId,
      vehicleId: linkedVehicleId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerRegistrationNo,
      vehicleName,
      vehicleType,
      vehicleCategory,
      branch: scopedBranch,
      bookingDate,
      status,
      paymentStatus,
      paymentMethod,
      amount: typeof amount !== "undefined" && amount !== "" ? Number(amount) : null,
      cardLast4,
      transactionId,
    });

    if (shouldReserveStock && linkedVehicle) {
      linkedVehicle.stock = Math.max(0, Number(linkedVehicle.stock || 0) - 1);
      linkedVehicle.status = linkedVehicle.stock > 0 ? "Available" : "Booked";
      await linkedVehicle.save();
    }

    let payment = null;

    if (paymentMethod || amount) {
      payment = await Payment.create({
        bookingId: booking._id,
        customerName,
        customerEmail,
        amount: typeof amount !== "undefined" && amount !== "" ? Number(amount) : 0,
        method: paymentMethod || "Debit Card",
        cardLast4,
        transactionId,
        branch: scopedBranch,
        status: paymentStatus === "Paid" ? "Completed" : "Pending",
      });
    }

    res.status(201).json({
      message: "Booking added successfully",
      booking,
      payment,
    });

    const customerEmailForNotification = String(customerEmail || req.user?.email || "").trim();
    if (customerEmailForNotification) {
      try {
        await sendBookingConfirmationEmail({
          to: customerEmailForNotification,
          booking,
        });
      } catch (emailError) {
        console.error("Booking confirmation email failed:", emailError);
      }
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getBookings = async (req, res) => {
  try {
    const scopedFiltersResult = applyBookingBranchScope(req, buildBookingFilters(req.query));
    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const filters = scopedFiltersResult.filters;
    const bookings = await Booking.find(filters).sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(booking.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only access bookings from your branch" });
      }
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBooking = async (req, res) => {
  try {
    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(existingBooking.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only update bookings from your branch" });
      }
    }

    const payload = {
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      customerPhone: req.body.customerPhone,
      customerAddress: req.body.customerAddress,
      paymentMethod: req.body.paymentMethod,
    };

    if (typeof payload.customerPhone !== "undefined" && !isValidPhoneNumber(payload.customerPhone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    if (typeof payload.customerPhone !== "undefined") {
      payload.customerPhone = normalizePhone(payload.customerPhone);
    }

    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === "undefined") {
        delete payload[key];
      }
    });

    const booking = await Booking.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(booking.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only delete bookings from your branch" });
      }
    }

    if (booking.customerId || booking.customerEmail) {
      await cascadeDeleteCustomerBookingsAndPayments({
        customerId: booking.customerId,
        customerEmail: booking.customerEmail,
      });

      return res.status(200).json({
        message: "Booking deleted successfully along with related customer, bookings and payments",
      });
    }

    await restoreVehicleAvailabilityForBooking(booking);
    await Payment.deleteMany({ bookingId: booking._id });
    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
};