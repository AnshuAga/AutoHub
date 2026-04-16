const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Delivery = require("../models/Delivery");
const { createRazorpayOrder, verifyRazorpaySignature } = require("../utils/razorpayGateway");

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
      { bookingNo: regex },
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

const resolveBookingPaymentContext = async ({ bookingId, bookingNo, customerName, customerEmail, amount, branch }) => {
  let resolvedBookingNo = String(bookingNo || "").trim();
  let resolvedCustomerName = String(customerName || "").trim();
  let resolvedCustomerEmail = String(customerEmail || "").trim();
  let resolvedAmount = Number(amount);
  let resolvedBranch = String(branch || "").trim();

  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking) {
      resolvedBookingNo = resolvedBookingNo || booking.bookingNo || "";
      resolvedCustomerName = resolvedCustomerName || booking.customerName || "";
      resolvedCustomerEmail = resolvedCustomerEmail || booking.customerEmail || "";
      resolvedAmount = Number.isFinite(resolvedAmount) && resolvedAmount > 0 ? resolvedAmount : Number(booking.amount || 0);
      resolvedBranch = resolvedBranch || booking.branch || "Main Branch";
    }
  }

  return {
    bookingNo: resolvedBookingNo,
    customerName: resolvedCustomerName,
    customerEmail: resolvedCustomerEmail,
    amount: resolvedAmount,
    branch: resolvedBranch || "Main Branch",
  };
};

const createBookingRazorpayOrder = async (req, res) => {
  try {
    const {
      bookingId,
      bookingNo,
      customerName,
      customerEmail,
      amount,
      branch,
      method = "Online",
    } = req.body;

    const paymentContext = await resolveBookingPaymentContext({
      bookingId,
      bookingNo,
      customerName,
      customerEmail,
      amount,
      branch,
    });

    if (!paymentContext.customerName || !paymentContext.amount || paymentContext.amount <= 0) {
      return res.status(400).json({ message: "customerName and amount are required" });
    }

    const receipt = `booking-${paymentContext.bookingNo || bookingId || Date.now()}`;
    const result = await createRazorpayOrder({
      amount: paymentContext.amount,
      receipt,
      notes: {
        bookingId: bookingId || "",
        bookingNo: paymentContext.bookingNo || "",
        customerName: paymentContext.customerName,
        customerEmail: paymentContext.customerEmail || "",
        branch: paymentContext.branch,
        method,
        paymentType: "booking",
      },
    });

    res.status(200).json({
      message: "Razorpay order created",
      keyId: result.keyId,
      order: result.order,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const verifyBookingRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      bookingNo,
      customerName,
      customerEmail,
      amount,
      method = "Online",
      branch,
      cardLast4 = "",
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay payment details" });
    }

    if (!verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })) {
      return res.status(400).json({ message: "Invalid Razorpay signature" });
    }

    const paymentContext = await resolveBookingPaymentContext({
      bookingId,
      bookingNo,
      customerName,
      customerEmail,
      amount,
      branch,
    });

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }
      paymentContext.branch = userBranch;
    }

    if (!paymentContext.customerName || !paymentContext.amount || paymentContext.amount <= 0) {
      return res.status(400).json({ message: "Unable to resolve payment details" });
    }

    const existingPayment = await Payment.findOne({ transactionId: razorpay_payment_id });
    const paymentPayload = {
      bookingId: bookingId || existingPayment?.bookingId || null,
      bookingNo: paymentContext.bookingNo || existingPayment?.bookingNo || "",
      customerName: paymentContext.customerName,
      customerEmail: paymentContext.customerEmail || "",
      amount: Number(paymentContext.amount || 0),
      method,
      status: "Completed",
      cardLast4: cardLast4 || existingPayment?.cardLast4 || "",
      transactionId: razorpay_payment_id,
      branch: paymentContext.branch || existingPayment?.branch || "Main Branch",
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      gatewayName: "Razorpay",
    };

    const payment = existingPayment
      ? await Payment.findByIdAndUpdate(existingPayment._id, paymentPayload, {
          new: true,
          runValidators: true,
        })
      : await Payment.create(paymentPayload);

    await syncBookingPaymentStatus({
      bookingId: payment.bookingId,
      paymentStatus: "Completed",
      method: payment.method,
      transactionId: payment.transactionId,
      cardLast4: payment.cardLast4,
      branch: payment.branch,
    });

    res.status(200).json({
      message: "Payment verified successfully",
      payment,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

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

      const resolvedBookingId =
        normalizedPayment.bookingId && typeof normalizedPayment.bookingId === "object"
          ? String(normalizedPayment.bookingId._id || "")
          : String(normalizedPayment.bookingId || "");

      const dedupeKey =
        resolvedBookingId
          ? `booking-id:${resolvedBookingId}`
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
  createBookingRazorpayOrder,
  verifyBookingRazorpayPayment,
  addPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};