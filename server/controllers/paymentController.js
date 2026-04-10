const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Delivery = require("../models/Delivery");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();

const applyPaymentBranchScope = (req, filters) => {
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

const buildPaymentFilters = (query = {}) => {
  const { q, method, status, branch, customerEmail, minAmount, maxAmount } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [
      { customerName: regex },
      { transactionId: regex },
      { cardLast4: regex },
    ];
  }
  if (method) {
    filters.method = new RegExp(`^${escapeRegex(method)}$`, "i");
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
  if (minAmount || maxAmount) {
    filters.amount = {};
    if (minAmount) {
      filters.amount.$gte = Number(minAmount);
    }
    if (maxAmount) {
      filters.amount.$lte = Number(maxAmount);
    }
  }

  return filters;
};

const generateTransactionId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const normalizeTransactionId = (value) => (typeof value === "string" ? value.trim() : "");

const mapPaymentToBookingStatus = (paymentStatus) => {
  const normalizedStatus = String(paymentStatus || "").toLowerCase();
  if (normalizedStatus === "completed") {
    return "Paid";
  }
  if (normalizedStatus === "pending") {
    return "Partially Paid";
  }
  return "Unpaid";
};

const upsertDeliveryForBooking = async (booking, { method, transactionId, branch }) => {
  if (!booking?._id) {
    return;
  }

  const existingDelivery = await Delivery.findOne({ bookingId: booking._id });
  const deliveryPayload = {
    bookingId: booking._id,
    bookingNo: booking.bookingNo || "",
    customerName: booking.customerName,
    customerEmail: booking.customerEmail || "",
    vehicleName: booking.vehicleName,
    branch: booking.branch || branch || "Main Branch",
    deliveryDate: existingDelivery?.deliveryDate || new Date(),
    status: existingDelivery?.status || "Pending",
    notes:
      existingDelivery?.notes ||
      `Auto-created after ${method || "payment"} payment${transactionId ? ` (${transactionId})` : ""}`,
  };

  if (existingDelivery) {
    await Delivery.findByIdAndUpdate(existingDelivery._id, deliveryPayload, {
      new: true,
      runValidators: true,
    });
    return;
  }

  await Delivery.create(deliveryPayload);
};

const syncBookingPaymentStatus = async ({ bookingId, paymentStatus, method, transactionId, cardLast4, branch }) => {
  if (!bookingId) {
    return;
  }

  const normalizedStatus = String(paymentStatus || "").toLowerCase();
  const updatePayload = {
    paymentStatus: mapPaymentToBookingStatus(paymentStatus),
  };

  if (normalizedStatus === "completed") {
    updatePayload.paymentMethod = method || "Credit Card";
    updatePayload.transactionId = transactionId || "";
    if (cardLast4) {
      updatePayload.cardLast4 = cardLast4;
    }
    updatePayload.status = "Confirmed";
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    updatePayload,
    { new: true }
  );

  if (normalizedStatus === "completed" && updatedBooking) {
    await upsertDeliveryForBooking(updatedBooking, {
      method,
      transactionId,
      branch,
    });
  }
};

const addPayment = async (req, res) => {
  try {
    const { bookingId, customerName, customerEmail, amount, method, status, cardLast4, transactionId, branch } =
      req.body;

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : branch;
    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    if (!customerName || !amount || !method) {
      return res.status(400).json({ message: "customerName, amount and method are required" });
    }

    const normalizedStatus = String(status || "").toLowerCase();
    const providedTransactionId = normalizeTransactionId(transactionId);
    const resolvedTransactionId =
      normalizedStatus === "completed" && !providedTransactionId ? generateTransactionId() : providedTransactionId;

    if (resolvedTransactionId) {
      const existingPaymentWithTransaction = await Payment.findOne({ transactionId: resolvedTransactionId });
      if (existingPaymentWithTransaction) {
        return res.status(409).json({ message: "Transaction ID already exists" });
      }
    }

    let resolvedBookingNo = "";
    if (bookingId) {
      const linkedBooking = await Booking.findById(bookingId);
      resolvedBookingNo = linkedBooking?.bookingNo || "";
    }

    const paymentPayload = {
      bookingId,
      bookingNo: resolvedBookingNo,
      customerName,
      customerEmail,
      amount: Number(amount),
      method,
      status,
      cardLast4,
      transactionId: resolvedTransactionId,
      branch: scopedBranch,
    };

    const payment = bookingId
      ? await Payment.findOneAndUpdate(
          { bookingId },
          paymentPayload,
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        )
      : await Payment.create(paymentPayload);

    await syncBookingPaymentStatus({
      bookingId,
      paymentStatus: status,
      method,
      transactionId: resolvedTransactionId,
      cardLast4,
      branch: scopedBranch,
    });

    res.status(201).json({
      message: "Payment added successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getPayments = async (req, res) => {
  try {
    const scopedFiltersResult = applyPaymentBranchScope(req, buildPaymentFilters(req.query));
    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const filters = scopedFiltersResult.filters;
    const payments = await Payment.find(filters)
      .populate("bookingId", "bookingNo")
      .sort({ createdAt: -1 });

    const normalizedPayments = [];
    const seenKeys = new Set();

    for (const payment of payments) {
      const paymentData = payment.toObject();
      const populatedBookingNo =
        paymentData.bookingId && typeof paymentData.bookingId === "object"
          ? paymentData.bookingId.bookingNo || ""
          : "";

      const normalizedPayment = {
        ...paymentData,
        bookingNo: paymentData.bookingNo || populatedBookingNo || "",
      };

      const dedupeKey =
        normalizedPayment.bookingId
          ? `booking-id:${normalizedPayment.bookingId}`
          :
        normalizedPayment.transactionId
          ? `txn:${normalizedPayment.transactionId}`
          : normalizedPayment.bookingNo
            ? `booking:${normalizedPayment.bookingNo}`
            : `id:${normalizedPayment._id}`;

      if (seenKeys.has(dedupeKey)) {
        continue;
      }

      seenKeys.add(dedupeKey);
      normalizedPayments.push(normalizedPayment);
    }

    res.status(200).json(normalizedPayments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(payment.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only access payments from your branch" });
      }
    }

    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const existingPayment = await Payment.findById(req.params.id);
    if (!existingPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(existingPayment.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only update payments from your branch" });
      }
    }

    const payload = { ...req.body };
    if (typeof payload.amount !== "undefined") {
      payload.amount = Number(payload.amount);
    }

    if (typeof payload.transactionId !== "undefined") {
      payload.transactionId = normalizeTransactionId(payload.transactionId);
    }

    const normalizedStatus = String(payload.status || "").toLowerCase();
    if (normalizedStatus === "completed" && !payload.transactionId) {
      payload.transactionId = generateTransactionId();
    }

    if (payload.transactionId) {
      const existingPaymentWithTransaction = await Payment.findOne({
        transactionId: payload.transactionId,
        _id: { $ne: req.params.id },
      });

      if (existingPaymentWithTransaction) {
        return res.status(409).json({ message: "Transaction ID already exists" });
      }
    }

    if (payload.bookingId) {
      const linkedBooking = await Booking.findById(payload.bookingId);
      payload.bookingNo = linkedBooking?.bookingNo || "";
    }

    if (isTeamScopedRole(req)) {
      payload.branch = getRequiredUserBranch(req);
    }

    const payment = await Payment.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    await syncBookingPaymentStatus({
      bookingId: payment.bookingId,
      paymentStatus: payment.status,
      method: payment.method,
      transactionId: payment.transactionId,
      cardLast4: payment.cardLast4,
      branch: payment.branch,
    });

    res.status(200).json({ message: "Payment updated successfully", payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(payment.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only delete payments from your branch" });
      }
    }

    await Payment.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};