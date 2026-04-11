const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const baseStyles = {
  body:
    "margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;",
  wrapper: "width:100%;padding:32px 16px;background:#f4f7fb;",
  card:
    "max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ee;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.08);",
  header:
    "padding:24px 32px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);color:#ffffff;",
  brand: "font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;opacity:0.95;",
  title: "margin:6px 0 0;font-size:26px;line-height:1.25;font-weight:800;",
  content: "padding:32px;",
  paragraph: "margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;",
  panel:
    "margin:24px 0;padding:20px 22px;background:#f8fafc;border:1px solid #dbe3ee;border-radius:16px;",
  panelLabel:
    "margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;font-weight:700;",
  panelValue: "margin:0;font-size:24px;line-height:1.3;font-weight:800;color:#0f172a;word-break:break-word;",
  detailList: "margin:0;padding:0;list-style:none;",
  detailItem:
    "padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:15px;line-height:1.6;color:#334155;",
  detailItemLast: "border-bottom:none;",
  button:
    "display:inline-block;margin-top:8px;padding:14px 22px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;",
  note:
    "margin:24px 0 0;padding:16px 18px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:12px;font-size:14px;line-height:1.7;color:#1e3a8a;",
  footer:
    "padding:22px 32px 30px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.6;color:#64748b;text-align:center;background:#f8fafc;",
};

const renderDetailList = (details = []) =>
  details
    .filter((detail) => detail && detail.label && typeof detail.value !== "undefined")
    .map(
      (detail, index, array) =>
        `<li style="${baseStyles.detailItem}${index === array.length - 1 ? baseStyles.detailItemLast : ""}"><strong style="color:#0f172a;">${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.value)}</li>`
    )
    .join("");

const buildBrandedEmail = ({
  title,
  preheader,
  greeting,
  intro,
  highlightLabel,
  highlightValue,
  details,
  buttonLabel,
  buttonUrl,
  note,
  footer = "AutoHub Support",
}) => {
  const buttonMarkup = buttonLabel && buttonUrl
    ? `<a href="${escapeHtml(buttonUrl)}" style="${baseStyles.button}">${escapeHtml(buttonLabel)}</a>`
    : "";

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="${baseStyles.body}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <div style="${baseStyles.wrapper}">
      <div style="${baseStyles.card}">
        <div style="${baseStyles.header}">
          <div style="${baseStyles.brand}">AutoHub</div>
          <h1 style="${baseStyles.title}">${escapeHtml(title)}</h1>
        </div>
        <div style="${baseStyles.content}">
          <p style="${baseStyles.paragraph}">${escapeHtml(greeting)}</p>
          <p style="${baseStyles.paragraph}">${escapeHtml(intro)}</p>
          ${highlightLabel && highlightValue ? `
          <div style="${baseStyles.panel}">
            <p style="${baseStyles.panelLabel}">${escapeHtml(highlightLabel)}</p>
            <p style="${baseStyles.panelValue}">${escapeHtml(highlightValue)}</p>
          </div>
          ` : ""}
          ${details && details.length ? `<ul style="${baseStyles.detailList}">${renderDetailList(details)}</ul>` : ""}
          ${buttonMarkup}
          ${note ? `<div style="${baseStyles.note}">${escapeHtml(note)}</div>` : ""}
        </div>
        <div style="${baseStyles.footer}">${escapeHtml(footer)}</div>
      </div>
    </div>
  </body>
</html>`;
};

const buildOtpEmailTemplate = ({ name, otp, purpose, expiryMinutes }) => {
  const subject = purpose === "register" ? "AutoHub Email Verification OTP" : "AutoHub Login OTP";
  const intro =
    purpose === "register"
      ? "Use the verification code below to confirm your email address and finish setting up your AutoHub account."
      : "Use the login code below to continue signing in to your AutoHub account.";

  const html = buildBrandedEmail({
    title: "Your One-Time Passcode",
    preheader: `Your AutoHub ${purpose === "register" ? "verification" : "login"} OTP is ${otp}`,
    greeting: name ? `Hello ${name},` : "Hello,",
    intro,
    highlightLabel: "One-Time Passcode",
    highlightValue: otp,
    details: [
      { label: "Purpose", value: purpose === "register" ? "Email verification" : "Login" },
      { label: "Valid for", value: `${expiryMinutes} minutes` },
    ],
    note: "If you did not request this code, you can ignore this email.",
  });

  const text = [
    `Hello ${name || "there"},`,
    "",
    intro,
    `OTP: ${otp}`,
    `Valid for: ${expiryMinutes} minutes`,
    "",
    "If you did not request this code, you can ignore this email.",
  ].join("\n");

  return { subject, html, text };
};

const buildEmployeeCredentialsTemplate = ({ name, email, password, designation, branch }) => {
  const html = buildBrandedEmail({
    title: "Employee Account Created",
    preheader: `AutoHub employee credentials for ${name || email}`,
    greeting: `Hello ${name || "Team Member"},`,
    intro:
      "Your AutoHub employee account has been created. Use the login details below to sign in for the first time.",
    highlightLabel: "Temporary Password",
    highlightValue: password,
    details: [
      { label: "Designation", value: designation },
      { label: "Branch", value: branch },
      { label: "Login Email", value: email },
    ],
    buttonLabel: "Open AutoHub Login",
    buttonUrl: process.env.CLIENT_URL || "",
    note: "Please change your password immediately after your first login.",
  });

  const text = [
    `Hello ${name || "Team Member"},`,
    "",
    "Your AutoHub employee account has been created.",
    `Designation: ${designation}`,
    `Branch: ${branch}`,
    `Login Email: ${email}`,
    `Temporary Password: ${password}`,
    "",
    "Please change your password immediately after your first login.",
    "",
    "AutoHub Support",
  ].join("\n");

  return {
    subject: "AutoHub Employee Login Credentials",
    html,
    text,
  };
};

const formatDateValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTimeValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).trim();
};

const buildBookingConfirmationTemplate = ({
  name,
  email,
  bookingNo,
  vehicleName,
  vehicleType,
  bookingDate,
  branch,
  paymentStatus,
  amount,
}) => {
  const displayDate = formatDateValue(bookingDate);
  const displayAmount = amount !== null && typeof amount !== "undefined" && amount !== ""
    ? `Rs. ${amount}`
    : "Not available";

  const html = buildBrandedEmail({
    title: "Booking Confirmed",
    preheader: `Your vehicle booking ${bookingNo} has been received`,
    greeting: `Hello ${name || "there"},`,
    intro: "Your car booking has been created successfully. We have recorded the booking details below.",
    highlightLabel: "Booking Reference",
    highlightValue: bookingNo,
    details: [
      { label: "Vehicle", value: vehicleName },
      { label: "Type", value: vehicleType },
      { label: "Booking Date", value: displayDate },
      { label: "Branch", value: branch },
      { label: "Payment Status", value: paymentStatus || "Pending" },
      { label: "Estimated Amount", value: displayAmount },
      { label: "Customer Email", value: email },
    ],
    note: "If any booking detail looks incorrect, please contact the AutoHub team as soon as possible.",
  });

  const text = [
    `Hello ${name || "there"},`,
    "",
    "Your car booking has been created successfully.",
    `Booking Reference: ${bookingNo}`,
    `Vehicle: ${vehicleName}`,
    `Type: ${vehicleType}`,
    `Booking Date: ${displayDate}`,
    `Branch: ${branch}`,
    `Payment Status: ${paymentStatus || "Pending"}`,
    `Estimated Amount: ${displayAmount}`,
    "",
    "If any booking detail looks incorrect, please contact the AutoHub team as soon as possible.",
  ].join("\n");

  return {
    subject: `AutoHub Booking Confirmation - ${bookingNo}`,
    html,
    text,
  };
};

const buildServiceBookingConfirmationTemplate = ({
  name,
  email,
  serviceNo,
  vehicleName,
  vehicleNumber,
  scheduledDate,
  scheduledTime,
  branch,
  selectedServices,
  estimatedCost,
  paymentStatus,
}) => {
  const displayDate = formatDateValue(scheduledDate);
  const displayTime = formatTimeValue(scheduledTime);
  const displayEstimatedCost = estimatedCost !== null && typeof estimatedCost !== "undefined" && estimatedCost !== ""
    ? `Rs. ${estimatedCost}`
    : "Not available";
  const serviceLines = Array.isArray(selectedServices)
    ? selectedServices
      .map((service) => `${service.serviceName}${service.price ? ` - Rs. ${service.price}` : ""}`)
      .join(", ")
    : "";

  const html = buildBrandedEmail({
    title: "Service Booking Received",
    preheader: `Your service booking ${serviceNo} is confirmed`,
    greeting: `Hello ${name || "there"},`,
    intro: "Your service booking has been received successfully. Here is a summary of the request.",
    highlightLabel: "Service Reference",
    highlightValue: serviceNo,
    details: [
      { label: "Vehicle", value: vehicleName },
      { label: "Vehicle Number", value: vehicleNumber || "Not provided" },
      { label: "Scheduled Date", value: displayDate },
      { label: "Scheduled Time", value: displayTime || "Not provided" },
      { label: "Branch", value: branch },
      { label: "Services", value: serviceLines || "Selected services" },
      { label: "Estimated Cost", value: displayEstimatedCost },
      { label: "Payment Status", value: paymentStatus || "Unpaid" },
      { label: "Customer Email", value: email },
    ],
    note: "Our team will review the booking and proceed with the next steps.",
  });

  const text = [
    `Hello ${name || "there"},`,
    "",
    "Your service booking has been received successfully.",
    `Service Reference: ${serviceNo}`,
    `Vehicle: ${vehicleName}`,
    `Vehicle Number: ${vehicleNumber || "Not provided"}`,
    `Scheduled Date: ${displayDate}`,
    `Scheduled Time: ${displayTime || "Not provided"}`,
    `Branch: ${branch}`,
    `Services: ${serviceLines || "Selected services"}`,
    `Estimated Cost: ${displayEstimatedCost}`,
    `Payment Status: ${paymentStatus || "Unpaid"}`,
    "",
    "Our team will review the booking and proceed with the next steps.",
  ].join("\n");

  return {
    subject: `AutoHub Service Booking Confirmation - ${serviceNo}`,
    html,
    text,
  };
};

module.exports = {
  buildOtpEmailTemplate,
  buildEmployeeCredentialsTemplate,
  buildBookingConfirmationTemplate,
  buildServiceBookingConfirmationTemplate,
};
