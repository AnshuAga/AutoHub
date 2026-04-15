import { api } from "./api";

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
};

export const startRazorpayCheckout = async ({
  endpointBase,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  bookingId,
  bookingNo,
  branch,
  method = "Online",
  paymentType,
  description,
  notes = {},
  prefill = {},
}) => {
  const orderResponse = await api.post(`${endpointBase}/razorpay/order`, {
    bookingId,
    bookingNo,
    customerName,
    customerEmail,
    amount,
    branch,
    method,
    paymentType,
  });

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Unable to load Razorpay checkout");
  }

  const { order, keyId } = orderResponse.data;

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "AutoHub",
      description: description || "Secure Razorpay payment",
      order_id: order.id,
      prefill: {
        name: customerName || "",
        email: customerEmail || "",
        contact: customerPhone || "",
        ...prefill,
      },
      notes: {
        bookingId: bookingId || "",
        bookingNo: bookingNo || "",
        branch: branch || "",
        method: method || "",
        paymentType: paymentType || "",
        ...notes,
      },
      theme: {
        color: "#0f766e",
      },
      handler: async (response) => {
        try {
          const verifyResponse = await api.post(`${endpointBase}/razorpay/verify`, {
            ...response,
            bookingId,
            bookingNo,
            customerName,
            customerEmail,
            amount,
            branch,
            method,
            paymentType,
          });

          resolve(verifyResponse.data);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    };

    const checkout = new window.Razorpay(options);
    checkout.open();
  });
};