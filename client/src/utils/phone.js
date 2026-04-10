const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;

export const normalizePhoneInput = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

export const isTenDigitPhoneNumber = (value) => TEN_DIGIT_PHONE_REGEX.test(String(value || "").trim());