const Employee = require("../models/Employee");
const ServiceBooking = require("../models/ServiceBooking");
const ServiceCategory = require("../models/ServiceCategory");
const Payment = require("../models/Payment");
const nodemailer = require("nodemailer");
const { isValidPhoneNumber, normalizePhone } = require("../utils/phone");
const { buildServiceBookingConfirmationTemplate } = require("../utils/emailTemplates");

const DEFAULT_SERVICE_TYPES = [
  { name: "Oil Change", price: 500 },
  { name: "Engine Repair", price: 2000 },
  { name: "Tyre Replacement", price: 3000 },
  { name: "Washing", price: 300 },
  { name: "Battery Check", price: 200 },
];

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

  if (role === "mechanic" || role === "delivery man" || role === "deliveryman") {
    return role === "deliveryman" ? "delivery man" : role;
  }

  return designation;
};
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();
const isAdmin = (req) => getUserRole(req) === "admin";
const isAdminOrManager = (req) => {
  const role = getUserRole(req);
  const designation = getUserDesignation(req);
  return role === "admin" || role === "manager" || designation === "branch manager";
};
const isEmployee = (req) => getUserRole(req) === "employee";
const isStaffRole = (req) => ["admin", "manager", "employee"].includes(getUserRole(req));
const isCustomer = (req) => getUserRole(req) === "customer";
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

const sendServiceBookingConfirmationEmail = async ({ to, booking }) => {
  if (!to) {
    return;
  }

  const transporter = getEmailTransporter();
  const from = normalizeEnvValue(process.env.SMTP_FROM) || normalizeEnvValue(process.env.SMTP_USER);
  const { subject, html, text } = buildServiceBookingConfirmationTemplate({
    name: booking.customerName,
    email: to,
    serviceNo: booking.serviceNo,
    vehicleName: booking.vehicleName,
    vehicleNumber: booking.vehicleNumber,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    branch: booking.branch,
    selectedServices: booking.selectedServices,
    estimatedCost: booking.estimatedCost,
    paymentStatus: booking.paymentStatus,
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const validateAssignableMechanic = async (req, mechanicId) => {
  const normalizedMechanicId = String(mechanicId || "").trim();
  if (!normalizedMechanicId) {
    return { ok: false, status: 400, message: "Assigned mechanic is required" };
  }

  const mechanic = await Employee.findById(normalizedMechanicId).select("_id name role designation branch");

  if (!mechanic) {
    return { ok: false, status: 400, message: "Assigned mechanic not found" };
  }

  if (String(mechanic.designation || "").toLowerCase() !== "employee") {
    return { ok: false, status: 400, message: "Only employees can be assigned as mechanics" };
  }

  if (String(mechanic.role || "").toLowerCase() !== "mechanic") {
    return { ok: false, status: 400, message: "Selected employee is not a mechanic" };
  }

  if (isTeamScopedRole(req)) {
    const userBranch = getRequiredUserBranch(req);
    if (!userBranch) {
      return { ok: false, status: 403, message: "Your account is missing branch mapping" };
    }

    if (String(mechanic.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
      return { ok: false, status: 403, message: "You can only assign mechanics from your branch" };
    }
  }

  return { ok: true, mechanic };
};

const applyBranchScope = (req, filters) => {
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

const generateServiceNo = async () => {
  const today = new Date();
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;

  let sequence = 1;
  while (true) {
    const serviceNo = `SRV-${yyyymmdd}-${String(sequence).padStart(4, "0")}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await ServiceBooking.exists({ serviceNo });
    if (!exists) {
      return serviceNo;
    }
    sequence += 1;
  }
};

const generateInvoiceNo = async () => {
  const count = await ServiceBooking.countDocuments({
    invoiceNo: { $exists: true, $ne: "" },
  });
  return `INV-SRV-${String(count + 1).padStart(6, "0")}`;
};

const ensureCategoriesSeeded = async () => {
  const categoryCount = await ServiceCategory.countDocuments();
  if (categoryCount > 0) {
    return;
  }

  await ServiceCategory.insertMany(
    DEFAULT_SERVICE_TYPES.map((item) => ({
      name: item.name,
      description: `${item.name} service`,
      price: item.price,
      isActive: true,
    }))
  );
};

const validateSelectedServices = async (selectedServices = []) => {
  if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
    return { ok: false, status: 400, message: "At least one service must be selected" };
  }

  const requestedIds = selectedServices
    .map((item) => String(item?.serviceId || item?._id || "").trim())
    .filter(Boolean);

  if (requestedIds.length !== selectedServices.length) {
    return {
      ok: false,
      status: 400,
      message: "Each selected service must include a valid serviceId",
    };
  }

  const categories = await ServiceCategory.find({ _id: { $in: requestedIds } }).select("_id name price isActive");
  if (categories.length !== requestedIds.length) {
    return { ok: false, status: 400, message: "One or more selected services are invalid" };
  }

  const categoryById = new Map(categories.map((category) => [String(category._id), category]));
  const inactiveServices = [];
  const normalizedSelectedServices = [];

  for (const item of selectedServices) {
    const serviceId = String(item?.serviceId || item?._id || "").trim();
    const category = categoryById.get(serviceId);

    if (!category) {
      return { ok: false, status: 400, message: "One or more selected services are invalid" };
    }

    if (!category.isActive) {
      inactiveServices.push(category.name);
      continue;
    }

    normalizedSelectedServices.push({
      serviceId: category._id,
      serviceName: category.name,
      price: Number(category.price || 0),
    });
  }

  if (inactiveServices.length > 0) {
    return {
      ok: false,
      status: 400,
      message: `Disabled services cannot be booked: ${inactiveServices.join(", ")}`,
    };
  }

  const estimatedTotal = normalizedSelectedServices.reduce((sum, service) => sum + (service.price || 0), 0);
  return {
    ok: true,
    selectedServices: normalizedSelectedServices,
    estimatedTotal,
  };
};

const getAssignedEmployeeFilter = async (req) => {
  const userName = String(req.user?.name || "").trim();
  const userEmail = String(req.user?.email || "").trim();
  const userBranch = String(req.user?.branch || "").trim();

  let employee = await Employee.findOne({
    $or: [
      { email: new RegExp(`^${escapeRegex(userEmail)}$`, "i") },
      { name: new RegExp(`^${escapeRegex(userName)}$`, "i") },
    ],
    ...(userBranch ? { branch: new RegExp(`^${escapeRegex(userBranch)}$`, "i") } : {}),
  }).select("_id name role designation branch");

  if (!employee) {
    employee = await Employee.findOne({
      $or: [
        { email: new RegExp(`^${escapeRegex(userEmail)}$`, "i") },
        { name: new RegExp(`^${escapeRegex(userName)}$`, "i") },
      ],
    }).select("_id name role designation branch");
  }

  if (!employee) {
    if (!userName) {
      return { ok: false, status: 403, message: "No linked employee profile found for your account" };
    }

    return {
      ok: true,
      employee: null,
      employeeName: userName,
      filter: {
        assignedMechanicName: new RegExp(`^${escapeRegex(userName)}$`, "i"),
      },
    };
  }

  return {
    ok: true,
    employee,
    employeeName: employee.name,
    filter: {
      $or: [
        { assignedMechanicId: employee._id },
        { assignedMechanicName: new RegExp(`^${escapeRegex(employee.name)}$`, "i") },
      ],
    },
  };
};

const generatePaymentTransactionId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const syncServicePaymentRecord = async ({ beforeBooking, afterBooking }) => {
  const beforePaid = String(beforeBooking?.paymentStatus || "").toLowerCase() === "paid";
  const afterPaid = String(afterBooking?.paymentStatus || "").toLowerCase() === "paid";

  if (!afterPaid) {
    return;
  }

  const method = String(afterBooking?.paymentMethod || "").trim() || "UPI";
  const resolvedTransactionId =
    String(afterBooking?.transactionId || "").trim() || (beforePaid ? "" : generatePaymentTransactionId());

  const bookingNo = afterBooking.serviceNo || "";
  const existingPayment = await Payment.findOne({
    $or: [{ bookingNo }, { transactionId: resolvedTransactionId }],
  });

  const paymentPayload = {
    bookingId: null,
    bookingNo,
    customerName: afterBooking.customerName,
    customerEmail: afterBooking.customerEmail || "",
    amount: Number(afterBooking.actualCost || afterBooking.estimatedCost || 0),
    method,
    status: "Completed",
    transactionId: resolvedTransactionId,
    branch: afterBooking.branch || "Main Branch",
  };

  if (existingPayment) {
    await Payment.findByIdAndUpdate(existingPayment._id, paymentPayload, {
      new: true,
      runValidators: true,
    });
  } else {
    await Payment.create(paymentPayload);
  }

  if (resolvedTransactionId && !String(afterBooking?.transactionId || "").trim()) {
    await ServiceBooking.findByIdAndUpdate(afterBooking._id, { transactionId: resolvedTransactionId });
  }
};

const getServiceCategories = async (req, res) => {
  try {
    await ensureCategoriesSeeded();
    const filters = isAdmin(req) ? {} : { isActive: true };
    const categories = await ServiceCategory.find(filters).sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addServiceCategory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only admin can manage service categories" });
    }

    const { name, description, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: "Category name and price are required" });
    }

    const existing = await ServiceCategory.findOne({
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });
    if (existing) {
      return res.status(400).json({ message: "Service category already exists" });
    }

    const created = await ServiceCategory.create({
      name: String(name).trim(),
      description,
      price: Number(price),
      isActive: true,
    });

    res.status(201).json({ message: "Service category added", category: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateServiceCategory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only admin can manage service categories" });
    }

    const { price, isActive, description } = req.body;
    const updateData = {};

    if (price !== undefined) {
      updateData.price = Number(price);
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }
    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updated = await ServiceCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Service category updated", category: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteServiceCategory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only admin can manage service categories" });
    }

    const deleted = await ServiceCategory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Service category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceMechanics = async (req, res) => {
  try {
    const scopedResult = applyBranchScope(req, {
      designation: "Employee",
      role: "Mechanic",
    });
    if (!scopedResult.ok) {
      return res.status(scopedResult.status).json({ message: scopedResult.message });
    }

    const mechanics = await Employee.find(scopedResult.filters)
      .select("name email phone designation role branch")
      .sort({ name: 1 });

    res.status(200).json(mechanics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const buildServiceFilters = (query = {}) => {
  const { q, status, branch, customerEmail, fromDate, toDate } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [
      { customerName: regex },
      { vehicleName: regex },
      { vehicleNumber: regex },
      { assignedMechanicName: regex },
      { serviceNo: regex },
    ];
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
    filters.scheduledDate = {};
    if (fromDate) {
      filters.scheduledDate.$gte = new Date(fromDate);
    }
    if (toDate) {
      filters.scheduledDate.$lte = new Date(toDate);
    }
  }

  return filters;
};

const addServiceBooking = async (req, res) => {
  try {
    if (!isCustomer(req)) {
      return res.status(403).json({ message: "Only customers can create service bookings" });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      vehicleName,
      vehicleNumber,
      branch,
      selectedServices,
      scheduledDate,
      scheduledTime,
      issueDescription,
      estimatedCost,
      paymentStatus,
      paymentMethod,
      transactionId,
    } = req.body;

    if (!customerName || !vehicleName || !selectedServices || !scheduledDate) {
      return res
        .status(400)
        .json({ message: "customerName, vehicleName, selectedServices and scheduledDate are required" });
    }

    if (!customerPhone || !isValidPhoneNumber(customerPhone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const selectedServicesValidation = await validateSelectedServices(selectedServices);
    if (!selectedServicesValidation.ok) {
      return res.status(selectedServicesValidation.status).json({ message: selectedServicesValidation.message });
    }

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : branch || "Main Branch";
    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    const normalizedStatus = "Pending";
    const calculatedEstimatedCost =
      estimatedCost !== undefined ? Number(estimatedCost) : selectedServicesValidation.estimatedTotal;

    const booking = await ServiceBooking.create({
      serviceNo: await generateServiceNo(),
      customerName,
      customerEmail,
      customerPhone: normalizePhone(customerPhone),
      vehicleName,
      vehicleNumber,
      branch: scopedBranch,
      selectedServices: selectedServicesValidation.selectedServices,
      scheduledDate,
      scheduledTime,
      issueDescription,
      assignedMechanicId: null,
      assignedMechanicName: "",
      status: normalizedStatus,
      estimatedCost: Number(calculatedEstimatedCost),
      actualCost: Number(calculatedEstimatedCost),
      paymentStatus: paymentStatus || "Unpaid",
      paymentMethod,
      transactionId,
      invoiceNo: normalizedStatus === "Completed" ? await generateInvoiceNo() : "",
    });

    const customerEmailForNotification = String(customerEmail || req.user?.email || "").trim();
    if (customerEmailForNotification) {
      try {
        await sendServiceBookingConfirmationEmail({
          to: customerEmailForNotification,
          booking,
        });
      } catch (emailError) {
        console.error("Service booking confirmation email failed:", emailError);
      }
    }

    res.status(201).json({ message: "Service booking created", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceBookings = async (req, res) => {
  try {
    let filters = buildServiceFilters(req.query);
    const role = getUserRole(req);
    const designation = getUserDesignation(req);
    const isBranchManager = designation === "branch manager";

    if (role === "customer") {
      filters = {
        ...filters,
        customerEmail: new RegExp(`^${escapeRegex(String(req.user?.email || ""))}$`, "i"),
      };
    }

    if (role === "employee" && !isBranchManager) {
      if (designation === "delivery man") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignedFilterResult = await getAssignedEmployeeFilter(req);
      if (!assignedFilterResult.ok) {
        return res.status(assignedFilterResult.status).json({ message: assignedFilterResult.message });
      }

      if (designation === "mechanic") {
        filters = {
          $and: [filters, assignedFilterResult.filter],
        };
      } else {
        const unassignedFilter = {
          $or: [
            { assignedMechanicId: null },
            { assignedMechanicId: { $exists: false } },
            { assignedMechanicName: "" },
            { assignedMechanicName: { $exists: false } },
          ],
        };

        filters = {
          $and: [
            filters,
            {
              $or: [assignedFilterResult.filter, unassignedFilter],
            },
          ],
        };
      }
    }

    const scopedResult = applyBranchScope(req, filters);
    if (!scopedResult.ok) {
      return res.status(scopedResult.status).json({ message: scopedResult.message });
    }

    const bookings = await ServiceBooking.find(scopedResult.filters).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceBookingById = async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Service booking not found" });
    }

    const role = getUserRole(req);
    const designation = getUserDesignation(req);
    const isBranchManager = designation === "branch manager";
    if (role === "customer" && String(booking.customerEmail || "").toLowerCase() !== String(req.user?.email || "").toLowerCase()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch || String(booking.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    if (role === "employee" && !isBranchManager) {
      if (designation !== "mechanic") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignedFilterResult = await getAssignedEmployeeFilter(req);
      if (!assignedFilterResult.ok) {
        return res.status(assignedFilterResult.status).json({ message: assignedFilterResult.message });
      }

      const isAssigned =
        (assignedFilterResult.employee &&
          String(booking.assignedMechanicId || "") === String(assignedFilterResult.employee._id)) ||
        String(booking.assignedMechanicName || "").toLowerCase() ===
          String(assignedFilterResult.employeeName || "").toLowerCase();

      if (!isAssigned) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateServiceBooking = async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Service booking not found" });
    }

    const role = getUserRole(req);
    const designation = getUserDesignation(req);
    const isBranchManager = designation === "branch manager";
    if (role === "customer" && String(booking.customerEmail || "").toLowerCase() !== String(req.user?.email || "").toLowerCase()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch || String(booking.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    if (role === "employee" && !isBranchManager) {
      if (designation !== "mechanic") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignedFilterResult = await getAssignedEmployeeFilter(req);
      if (!assignedFilterResult.ok) {
        return res.status(assignedFilterResult.status).json({ message: assignedFilterResult.message });
      }

      const isAssigned =
        (assignedFilterResult.employee &&
          String(booking.assignedMechanicId || "") === String(assignedFilterResult.employee._id)) ||
        String(booking.assignedMechanicName || "").toLowerCase() ===
          String(assignedFilterResult.employeeName || "").toLowerCase();

      if (!isAssigned) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    const updates = { ...req.body };

    if (typeof updates.customerPhone !== "undefined" && !isValidPhoneNumber(updates.customerPhone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    if (typeof updates.customerPhone !== "undefined") {
      updates.customerPhone = normalizePhone(updates.customerPhone);
    }

    if (!isStaffRole(req)) {
      delete updates.status;
      delete updates.assignedMechanicId;
      delete updates.assignedMechanicName;
      delete updates.estimatedCost;
      delete updates.actualCost;
    }

    if (!isAdminOrManager(req)) {
      delete updates.assignedMechanicId;
      delete updates.assignedMechanicName;
    }

    if (isAdminOrManager(req) && Object.prototype.hasOwnProperty.call(updates, "assignedMechanicId")) {
      const mechanicId = String(updates.assignedMechanicId || "").trim();

      if (!mechanicId) {
        updates.assignedMechanicId = null;
        updates.assignedMechanicName = "";
      } else {
        const mechanicResult = await validateAssignableMechanic(req, mechanicId);
        if (!mechanicResult.ok) {
          return res.status(mechanicResult.status).json({ message: mechanicResult.message });
        }

        updates.assignedMechanicId = mechanicResult.mechanic._id;
        updates.assignedMechanicName = mechanicResult.mechanic.name;
      }
    }

    if (updates.status === "Completed" && !booking.invoiceNo && !updates.invoiceNo) {
      updates.invoiceNo = await generateInvoiceNo();
    }

    if (updates.estimatedCost !== undefined) {
      updates.estimatedCost = Number(updates.estimatedCost || 0);
      if (updates.actualCost === undefined) {
        updates.actualCost = Number(updates.estimatedCost);
      }
    }
    if (updates.actualCost !== undefined) {
      updates.actualCost = Number(updates.actualCost || 0);
    }

    if (updates.selectedServices !== undefined) {
      const selectedServicesValidation = await validateSelectedServices(updates.selectedServices);
      if (!selectedServicesValidation.ok) {
        return res.status(selectedServicesValidation.status).json({ message: selectedServicesValidation.message });
      }

      updates.selectedServices = selectedServicesValidation.selectedServices;
      if (updates.estimatedCost === undefined) {
        updates.estimatedCost = Number(selectedServicesValidation.estimatedTotal);
      }
      if (updates.actualCost === undefined) {
        updates.actualCost = Number(updates.estimatedCost);
      }
    }

    const updatedBooking = await ServiceBooking.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    await syncServicePaymentRecord({
      beforeBooking: booking,
      afterBooking: updatedBooking,
    });

    res.status(200).json({ message: "Service booking updated", booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteServiceBooking = async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Service booking not found" });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only admin can delete service bookings" });
    }

    await ServiceBooking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Service booking deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignServiceBookingToSelf = async (req, res) => {
  try {
    if (!isEmployee(req)) {
      return res.status(403).json({ message: "Only employees can self-assign service bookings" });
    }

    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Service booking not found" });
    }

    const userBranch = getRequiredUserBranch(req);
    if (!userBranch || String(booking.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignedFilterResult = await getAssignedEmployeeFilter(req);
    if (!assignedFilterResult.ok) {
      return res.status(assignedFilterResult.status).json({ message: assignedFilterResult.message });
    }

    const ownMechanicId = assignedFilterResult.employee ? String(assignedFilterResult.employee._id) : "";
    const ownMechanicName = String(assignedFilterResult.employeeName || "").toLowerCase();
    const currentMechanicId = String(booking.assignedMechanicId || "");
    const currentMechanicName = String(booking.assignedMechanicName || "").toLowerCase();
    const isAssignedToCurrentEmployee =
      (ownMechanicId && currentMechanicId === ownMechanicId) ||
      (ownMechanicName && currentMechanicName && currentMechanicName === ownMechanicName);

    if (isAssignedToCurrentEmployee) {
      return res.status(200).json({ message: "Booking already assigned to you", booking });
    }

    const isUnassigned = !currentMechanicId && !currentMechanicName;
    if (!isUnassigned) {
      return res.status(400).json({ message: "This booking is already assigned to another mechanic" });
    }

    const updatedBooking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      {
        assignedMechanicId: assignedFilterResult.employee?._id || null,
        assignedMechanicName: assignedFilterResult.employeeName,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({ message: "Booking assigned to you", booking: updatedBooking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getServiceCategories,
  addServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  getServiceMechanics,
  addServiceBooking,
  getServiceBookings,
  getServiceBookingById,
  updateServiceBooking,
  assignServiceBookingToSelf,
  deleteServiceBooking,
};