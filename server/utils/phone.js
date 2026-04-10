const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;

const normalizePhone = (phone) => (typeof phone === "string" ? phone.trim() : "");

const isValidPhoneNumber = (phone) => TEN_DIGIT_PHONE_REGEX.test(normalizePhone(phone));

module.exports = {
  normalizePhone,
  isValidPhoneNumber,
};