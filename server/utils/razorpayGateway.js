const crypto = require("crypto");
const Razorpay = require("razorpay");

const normalizeEnvValue = (value) => (typeof value === "string" ? value.trim() : value);
const getRazorpayMaxAmountInInr = () => {
  const configuredLimit = normalizeEnvValue(process.env.RAZORPAY_MAX_AMOUNT_INR);
  if (!configuredLimit) {
    return null;
  }

  const maxAmount = Number(configuredLimit);
  return Number.isFinite(maxAmount) && maxAmount > 0 ? maxAmount : null;
};

const getRazorpayConfig = () => {
  const keyId = normalizeEnvValue(process.env.RAZORPAY_KEY_ID);
  const keySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server");
  }

  return {
    keyId,
    keySecret,
  };
};

const getRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayConfig();

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const amountToPaise = (amount) => {
  const numericAmount = Number(amount);
  const maxAmountInInr = getRazorpayMaxAmountInInr();

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (maxAmountInInr && numericAmount > maxAmountInInr) {
    const limitError = new Error(`Amount exceeds Razorpay limit of INR ${maxAmountInInr.toLocaleString("en-IN")}`);
    limitError.statusCode = 400;
    throw limitError;
  }

  return Math.round(numericAmount * 100);
};

const normalizeReceipt = (receipt) => {
  const rawValue = String(receipt || `rcpt-${Date.now()}`);
  const sanitized = rawValue.replace(/[^a-zA-Z0-9_\-./]/g, "-");
  return sanitized.slice(0, 40);
};

const createRazorpayOrder = async ({ amount, currency = "INR", receipt, notes = {} }) => {
  const client = getRazorpayClient();
  const { keyId } = getRazorpayConfig();

  let order;
  try {
    order = await client.orders.create({
      amount: amountToPaise(amount),
      currency,
      receipt: normalizeReceipt(receipt),
      notes,
    });
  } catch (error) {
    const gatewayStatus = Number(error?.statusCode || error?.status || 0);
    const gatewayDescription = error?.error?.description || error?.message || "Razorpay order creation failed";
    const wrappedError = new Error(gatewayDescription);
    wrappedError.statusCode = gatewayStatus >= 400 ? gatewayStatus : 502;
    throw wrappedError;
  }

  return {
    keyId,
    order,
  };
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getRazorpayConfig();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};

module.exports = {
  amountToPaise,
  createRazorpayOrder,
  getRazorpayConfig,
  verifyRazorpaySignature,
};