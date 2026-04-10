const Delivery = require("../models/Delivery");
const Booking = require("../models/Booking");
const Employee = require("../models/Employee");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const getUserDesignation = (req) => {
  const employeeRole = String(req?.user?.employeeRole || "").toLowerCase().trim();
  const designation = String(req?.user?.designation || "").toLowerCase().trim();
  const role = String(req?.user?.role || "").toLowerCase().trim();

  if (employeeRole) {
    return employeeRole === "deliveryman" ? "delivery man" : employeeRole;
  }

  if (designation && designation !== "employee" && designation !== "branch manager") {
    return designation === "deliveryman" ? "delivery man" : designation;
  }

  if (role === "delivery man" || role === "deliveryman" || role === "mechanic") {
    return role === "deliveryman" ? "delivery man" : role;
  }

  return designation;
};
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();
const isAdminOrManager = (req) => {
  const role = getUserRole(req);
  const designation = getUserDesignation(req);
  return role === "admin" || role === "manager" || designation === "branch manager";
};

const getLinkedDeliveryMan = async (req) => {
  const userName = String(req?.user?.name || "").trim();
  const userEmail = String(req?.user?.email || "").trim();
  const userBranch = String(req?.user?.branch || "").trim();

  if (!userName && !userEmail) {
    return null;
  }

  return Employee.findOne({
    $or: [
      { email: new RegExp(`^${escapeRegex(userEmail)}$`, "i") },
      { name: new RegExp(`^${escapeRegex(userName)}$`, "i") },
    ],
    designation: "Employee",
    role: "Delivery Man",
    ...(userBranch ? { branch: new RegExp(`^${escapeRegex(userBranch)}$`, "i") } : {}),
  }).select("_id name email role designation branch");
};

const getAssignableDeliveryManById = async (req, employeeId) => {
  const normalizedEmployeeId = String(employeeId || "").trim();
  if (!normalizedEmployeeId) {
    return { ok: false, status: 400, message: "Assigned delivery man is required" };
  }

  const employee = await Employee.findById(normalizedEmployeeId).select("_id name role designation branch");

  if (!employee) {
    return { ok: false, status: 400, message: "Assigned delivery man not found" };
  }

  if (String(employee.designation || "").toLowerCase() !== "employee") {
    return { ok: false, status: 400, message: "Only employees can be assigned as delivery men" };
  }

  if (String(employee.role || "").toLowerCase() !== "delivery man") {
    return { ok: false, status: 400, message: "Selected employee is not a delivery man" };
  }

  if (isTeamScopedRole(req)) {
    const userBranch = getRequiredUserBranch(req);
    if (!userBranch) {
      return { ok: false, status: 403, message: "Your account is missing branch mapping" };
    }

    if (String(employee.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
      return { ok: false, status: 403, message: "You can only assign delivery men from your branch" };
    }
  }

  return { ok: true, employee };
};

const applyDeliveryBranchScope = (req, filters) => {
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

const getDeliveryMen = async (req, res) => {
  try {
    const scopedFiltersResult = applyDeliveryBranchScope(req, {
      designation: "Employee",
      role: "Delivery Man",
    });

    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const deliveryMen = await Employee.find(scopedFiltersResult.filters)
      .select("name email phone designation role branch")
      .sort({ name: 1 });

    return res.status(200).json(deliveryMen);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const buildDeliveryFilters = (query = {}) => {
  const { q, status, branch, customerEmail, fromDate, toDate } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [{ customerName: regex }, { vehicleName: regex }, { notes: regex }];
  }
  if (status) {
    filters.status = new RegExp(`^${escapeRegex(status)}$`, "i");
  }
  if (branch) {
    filters.branch = new RegExp(escapeRegex(branch), "i");
  }
  if (customerEmail) {
    filters.customerEmail = new RegExp(`^${escapeRegex(customerEmail)}$`, "i");
  }
  if (fromDate || toDate) {
    filters.deliveryDate = {};
    if (fromDate) {
      filters.deliveryDate.$gte = new Date(fromDate);
    }
    if (toDate) {
      filters.deliveryDate.$lte = new Date(toDate);
    }
  }

  return filters;
};

const addDelivery = async (req, res) => {
  try {
    const { bookingId, customerName, vehicleName, branch, deliveryDate, status, notes } = req.body;

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : branch;
    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    if (!customerName || !vehicleName || !deliveryDate) {
      return res
        .status(400)
        .json({ message: "customerName, vehicleName and deliveryDate are required" });
    }

    let resolvedBookingId = bookingId || null;
    let resolvedBookingNo = "";

    let linkedBooking = null;
    if (resolvedBookingId) {
      linkedBooking = await Booking.findById(resolvedBookingId);
    } else {
      linkedBooking = await Booking.findOne({
        customerName: new RegExp(`^${escapeRegex(customerName)}$`, "i"),
        vehicleName: new RegExp(`^${escapeRegex(vehicleName)}$`, "i"),
        ...(scopedBranch ? { branch: new RegExp(`^${escapeRegex(scopedBranch)}$`, "i") } : {}),
      }).sort({ createdAt: -1 });
    }

    if (linkedBooking) {
      resolvedBookingId = linkedBooking._id;
      resolvedBookingNo = linkedBooking.bookingNo || "";
    }

    const delivery = await Delivery.create({
      bookingId: resolvedBookingId,
      bookingNo: resolvedBookingNo,
      customerName,
      vehicleName,
      branch: scopedBranch,
      deliveryDate,
      status,
      notes,
    });

    res.status(201).json({
      message: "Delivery added successfully",
      delivery,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getDeliveries = async (req, res) => {
  try {
    const role = getUserRole(req);
    const designation = getUserDesignation(req);

    if (role === "employee" && designation === "delivery man") {
      const linkedDeliveryMan = await getLinkedDeliveryMan(req);
      if (!linkedDeliveryMan) {
        return res.status(403).json({ message: "Only delivery men can view their deliveries" });
      }

      const deliveries = await Delivery.find({ assignedDeliveryMan: linkedDeliveryMan._id })
        .populate("assignedDeliveryMan", "name email role designation branch")
        .sort({ createdAt: -1 });

      return res.status(200).json(deliveries);
    }

    const scopedFiltersResult = applyDeliveryBranchScope(req, buildDeliveryFilters(req.query));
    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const filters = scopedFiltersResult.filters;
    const deliveries = await Delivery.find(filters)
      .populate("assignedDeliveryMan", "name email role designation branch")
      .sort({ createdAt: -1 });

    res.status(200).json(deliveries);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate(
      "assignedDeliveryMan",
      "name email role designation branch"
    );

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(delivery.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only access deliveries from your branch" });
      }
    }

    if (getUserRole(req) === "employee" && getUserDesignation(req) === "delivery man") {
      const linkedDeliveryMan = await getLinkedDeliveryMan(req);
      const assignedDeliveryManId = String(delivery.assignedDeliveryMan?._id || delivery.assignedDeliveryMan || "");
      if (!linkedDeliveryMan || assignedDeliveryManId !== String(linkedDeliveryMan._id || "")) {
        return res.status(403).json({ message: "You can only access deliveries assigned to you" });
      }
    }

    res.status(200).json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDelivery = async (req, res) => {
  try {
    const existingDelivery = await Delivery.findById(req.params.id);
    if (!existingDelivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(existingDelivery.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only update deliveries from your branch" });
      }
    }

    if (getUserRole(req) === "employee" && getUserDesignation(req) === "delivery man") {
      const linkedDeliveryMan = await getLinkedDeliveryMan(req);
      const assignedDeliveryManId = String(existingDelivery.assignedDeliveryMan || "");
      if (!linkedDeliveryMan || assignedDeliveryManId !== String(linkedDeliveryMan._id || "")) {
        return res.status(403).json({ message: "You can only update deliveries assigned to you" });
      }
    }

    const payload = { ...req.body };

    if (!isAdminOrManager(req)) {
      delete payload.assignedDeliveryMan;
    }

    if (isAdminOrManager(req) && Object.prototype.hasOwnProperty.call(payload, "assignedDeliveryMan")) {
      const deliveryManId = String(payload.assignedDeliveryMan || "").trim();

      if (!deliveryManId) {
        payload.assignedDeliveryMan = null;
      } else {
        const deliveryManResult = await getAssignableDeliveryManById(req, deliveryManId);
        if (!deliveryManResult.ok) {
          return res.status(deliveryManResult.status).json({ message: deliveryManResult.message });
        }

        payload.assignedDeliveryMan = deliveryManResult.employee._id;
      }
    }

    if (payload.bookingId) {
      const linkedBooking = await Booking.findById(payload.bookingId);
      payload.bookingNo = linkedBooking?.bookingNo || "";
    }

    if (isTeamScopedRole(req)) {
      payload.branch = getRequiredUserBranch(req);
    }

    const delivery = await Delivery.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate("assignedDeliveryMan", "name email role designation branch");

    res.status(200).json({ message: "Delivery updated successfully", delivery });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(delivery.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only delete deliveries from your branch" });
      }
    }

    await Delivery.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignDeliveryMan = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { assignToEmployeeId } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (!isAdminOrManager(req)) {
      return res.status(403).json({ message: "Only admin or branch manager can assign delivery men" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(delivery.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only assign delivery men to deliveries in your branch" });
      }
    }

    const normalizedAssigneeId = String(assignToEmployeeId || "").trim();

    if (!normalizedAssigneeId) {
      const unassignedDelivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { assignedDeliveryMan: null },
        { new: true }
      ).populate("assignedDeliveryMan", "name email role designation branch");

      return res.status(200).json({
        message: "Delivery man unassigned successfully",
        delivery: unassignedDelivery,
      });
    }

    const deliveryManResult = await getAssignableDeliveryManById(req, normalizedAssigneeId);
    if (!deliveryManResult.ok) {
      return res.status(deliveryManResult.status).json({ message: deliveryManResult.message });
    }

    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { assignedDeliveryMan: deliveryManResult.employee._id },
      { new: true }
    ).populate("assignedDeliveryMan", "name email role designation branch");

    res.status(200).json({
      message: "Delivery man assigned successfully",
      delivery: updatedDelivery,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markDeliveryAsDelivered = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Only the assigned delivery man can mark as delivered
      const userRole = getUserRole(req);
      const userDesignation = getUserDesignation(req);
      const linkedDeliveryMan = await getLinkedDeliveryMan(req);

      if (!(userRole === "employee" && userDesignation === "delivery man")) {
      return res.status(403).json({ message: "Only delivery men can mark deliveries as delivered" });
    }

    const assignedDeliveryManId = String(delivery.assignedDeliveryMan || "");
    if (!linkedDeliveryMan || assignedDeliveryManId !== String(linkedDeliveryMan._id || "")) {
      return res.status(403).json({ message: "You can only mark your assigned deliveries as delivered" });
    }

    const updatedDelivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      { status: "Delivered" },
      { new: true }
    );

    res.status(200).json({
      message: "Delivery marked as delivered successfully",
      delivery: updatedDelivery,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyDeliveries = async (req, res) => {
  try {
    const userRole = String(req?.user?.role || "").toLowerCase();

      const userDesignation = getUserDesignation(req);
      if (!(userRole === "employee" && userDesignation === "delivery man")) {
      return res.status(403).json({ message: "Only delivery men can view their deliveries" });
    }

    const linkedDeliveryMan = await getLinkedDeliveryMan(req);
    if (!linkedDeliveryMan) {
      return res.status(403).json({ message: "Only delivery men can view their deliveries" });
    }

    const deliveries = await Delivery.find({ assignedDeliveryMan: linkedDeliveryMan._id })
      .populate("assignedDeliveryMan", "name email role branch")
      .sort({ deliveryDate: -1 });

    res.status(200).json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addDelivery,
  getDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
  getDeliveryMen,
  assignDeliveryMan,
  markDeliveryAsDelivered,
  getMyDeliveries,
};