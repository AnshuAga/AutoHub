const Customer = require("../models/Customer");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Vehicle = require("../models/Vehicle");
const { isValidPhoneNumber, normalizePhone } = require("../utils/phone");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();

const applyCustomerBranchScope = (req, filters) => {
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

const buildCustomerFilters = (query = {}) => {
  const { q, branch } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { registrationNo: regex },
    ];
  }

  if (branch) {
    filters.branch = new RegExp(escapeRegex(branch), "i");
  }

  return filters;
};

const addCustomer = async (req, res) => {
  try {
    const { name, email, phone, branch, address } = req.body;

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : branch;
    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "name, email and phone are required" });
    }

    if (!isValidPhoneNumber(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const generatedRegistrationNo = await generateRegistrationNo();

    const customer = await Customer.create({
      name,
      email,
      phone: normalizePhone(phone),
      registrationNo: generatedRegistrationNo,
      branch: scopedBranch,
      address,
    });

    res.status(201).json({
      message: "Customer added successfully",
      customer,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const scopedFiltersResult = applyCustomerBranchScope(req, buildCustomerFilters(req.query));
    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const filters = scopedFiltersResult.filters;
    const customers = await Customer.find(filters).sort({ createdAt: -1 });

    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const latestBooking = await Booking.findOne({
          $or: [{ customerId: customer._id }, { customerEmail: customer.email }],
        })
          .select("bookingNo")
          .sort({ createdAt: -1 });

        return {
          ...customer.toObject(),
          bookingNo: latestBooking?.bookingNo || "",
        };
      })
    );

    res.status(200).json(enrichedCustomers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(customer.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only access customers from your branch" });
      }
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const existingCustomer = await Customer.findById(req.params.id);
    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(existingCustomer.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only update customers from your branch" });
      }
    }

    const payload = { ...req.body };
    delete payload.registrationNo;

    if (typeof payload.phone !== "undefined" && !isValidPhoneNumber(payload.phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    if (isTeamScopedRole(req)) {
      payload.branch = getRequiredUserBranch(req);
    }

    if (typeof payload.phone !== "undefined") {
      payload.phone = normalizePhone(payload.phone);
    }

    if (!existingCustomer.registrationNo) {
      payload.registrationNo = await generateRegistrationNo();
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ message: "Customer updated successfully", customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(customer.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only delete customers from your branch" });
      }
    }

    const relatedBookings = await Booking.find({
      $or: [{ customerId: customer._id }, { customerEmail: customer.email }],
    });

    for (const booking of relatedBookings) {
      await restoreVehicleAvailabilityForBooking(booking);
    }

    const relatedBookingIds = relatedBookings.map((booking) => booking._id);

    if (relatedBookingIds.length > 0) {
      await Payment.deleteMany({
        $or: [{ bookingId: { $in: relatedBookingIds } }, { customerEmail: customer.email }],
      });
      await Booking.deleteMany({ _id: { $in: relatedBookingIds } });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Customer deleted successfully along with related bookings and payments" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};