const Employee = require("../models/Employee");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { buildEmployeeCredentialsTemplate } = require("../utils/emailTemplates");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");
const normalizePhone = (phone) => (typeof phone === "string" ? phone.trim() : "");
const generateEmployeePassword = () => `Emp@${crypto.randomBytes(3).toString("hex")}`;
const ALLOWED_DESIGNATIONS = ["Employee", "Branch Manager", "Junior Manager"];
const ALLOWED_ROLES = ["Mechanic", "Sales Person", "Receptionist", "Delivery Man", "Other"];
const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const getUserDesignation = (req) => String(req?.user?.designation || "").toLowerCase();
const isAdmin = (req) => getUserRole(req) === "admin";
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));

const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();
const isManagementDesignation = (designation) =>
  ["Branch Manager", "Junior Manager"].includes(String(designation || "").trim());
const isManagerLikeUser = (req) => {
  const role = getUserRole(req);
  const designation = getUserDesignation(req);
  return role === "manager" || designation === "branch manager" || designation === "junior manager";
};

const ensureAdminAccess = (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Only admin can perform this action" });
    return false;
  }
  return true;
};

const ensureCanAddEmployee = (req) => {
  const role = getUserRole(req);
  if (role === "admin") {
    return { ok: true, branch: null, allowedDesignations: ALLOWED_DESIGNATIONS };
  }

  if (isManagerLikeUser(req)) {
    const userBranch = getRequiredUserBranch(req);
    if (!userBranch) {
      return { ok: false, status: 403, message: "Your account is missing branch mapping" };
    }

    return { ok: true, branch: userBranch, allowedDesignations: ["Employee", "Junior Manager"] };
  }

  return { ok: false, status: 403, message: "Only admin or branch manager can add employees" };
};

const ensureCanDeleteEmployee = async (req, targetEmployee) => {
  if (isAdmin(req)) {
    return { ok: true };
  }

  if (getUserRole(req) !== "manager") {
    return { ok: false, status: 403, message: "Only admin or branch manager can fire employees" };
  }

  const userBranch = getRequiredUserBranch(req);
  if (!userBranch) {
    return { ok: false, status: 403, message: "Your account is missing branch mapping" };
  }

  if (String(targetEmployee.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
    return { ok: false, status: 403, message: "You can only fire employees from your branch" };
  }

  if (String(targetEmployee.email || "").toLowerCase() === String(req.user?.email || "").toLowerCase()) {
    return { ok: false, status: 400, message: "Branch manager cannot fire themselves" };
  }

  if (String(targetEmployee.designation || "") !== "Employee") {
    return { ok: false, status: 403, message: "Branch manager can fire only employees" };
  }

  return { ok: true };
};

const applyEmployeeBranchScope = (req, filters) => {
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

const normalizeEnvValue = (value) => (typeof value === "string" ? value.trim() : value);

const getEmailTransporter = () => {
  const SMTP_HOST = normalizeEnvValue(process.env.SMTP_HOST);
  const SMTP_PORT = normalizeEnvValue(process.env.SMTP_PORT);
  const SMTP_USER = normalizeEnvValue(process.env.SMTP_USER);
  const SMTP_PASS = normalizeEnvValue(process.env.SMTP_PASS);
  const SMTP_PASS_SANITIZED =
    typeof SMTP_PASS === "string" ? SMTP_PASS.replace(/\s+/g, "") : SMTP_PASS;
  const SMTP_SECURE =
    String(process.env.SMTP_SECURE || (Number(SMTP_PORT) === 465 ? "true" : "false")).toLowerCase() === "true";
  const SMTP_REQUIRE_TLS =
    String(process.env.SMTP_REQUIRE_TLS || (Number(SMTP_PORT) === 587 ? "true" : "false")).toLowerCase() ===
    "true";

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS_SANITIZED) {
    throw new Error("SMTP credentials are not configured on the server");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE,
    requireTLS: SMTP_REQUIRE_TLS,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS_SANITIZED,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
  });
};

const sendEmployeeCredentialsEmail = async ({ to, name, password, designation, branch }) => {
  const transporter = getEmailTransporter();
  const from = normalizeEnvValue(process.env.SMTP_FROM) || normalizeEnvValue(process.env.SMTP_USER);
  const { subject, html, text } = buildEmployeeCredentialsTemplate({
    name,
    email: to,
    password,
    designation,
    branch,
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

const buildEmployeeFilters = (query = {}) => {
  const { q, designation, branch, minSalary, maxSalary } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  if (designation) {
    filters.designation = new RegExp(`^${escapeRegex(designation)}$`, "i");
  }
  if (branch) {
    filters.branch = new RegExp(escapeRegex(branch), "i");
  }
  if (minSalary || maxSalary) {
    filters.salary = {};
    if (minSalary) {
      filters.salary.$gte = Number(minSalary);
    }
    if (maxSalary) {
      filters.salary.$lte = Number(maxSalary);
    }
  }

  return filters;
};

const addEmployee = async (req, res) => {
  try {
    const addAccess = ensureCanAddEmployee(req);
    if (!addAccess.ok) {
      return res.status(addAccess.status).json({ message: addAccess.message });
    }

    const { name, email, phone, designation, role, branch, salary, employeeImage } = req.body;

    if (!name || !email || !phone || !designation || !branch || !salary) {
      return res
        .status(400)
        .json({ message: "name, email, phone, designation, branch and salary are required" });
    }

    const normalizedDesignation = String(designation).trim();
    const normalizedBranch = addAccess.branch || String(branch).trim();
    const normalizedPhone = normalizePhone(phone);

    if (!ALLOWED_DESIGNATIONS.includes(normalizedDesignation)) {
      return res.status(400).json({
        message: "Designation must be one of: Employee, Branch Manager, Junior Manager",
      });
    }

    if (!addAccess.allowedDesignations.includes(normalizedDesignation)) {
      return res.status(403).json({ message: "Branch manager can hire only employees and junior managers" });
    }

    if (!TEN_DIGIT_PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const normalizedRole = isManagementDesignation(normalizedDesignation) ? "" : String(role || "").trim();
    if (!isManagementDesignation(normalizedDesignation) && !ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        message: "Role must be one of: Mechanic, Sales Person, Receptionist, Delivery Man, Other",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingEmployee = await Employee.findOne({ email: normalizedEmail });
    if (existingEmployee) {
      return res.status(400).json({ message: "Employee with this email already exists" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "A login account with this email already exists" });
    }

    const plainPassword = generateEmployeePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const createdUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone: normalizedPhone,
      role: isManagementDesignation(normalizedDesignation) ? "manager" : "employee",
      designation: normalizedDesignation,
      branch: normalizedBranch,
      isEmailVerified: true,
      isRegistrationCompleted: true,
    });

    let employee;
    try {
      employee = await Employee.create({
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        designation: normalizedDesignation,
        role: normalizedRole,
        branch: normalizedBranch,
        salary: Number(salary),
        employeeImage,
      });
    } catch (employeeError) {
      await User.findByIdAndDelete(createdUser._id);
      throw employeeError;
    }

    try {
      await sendEmployeeCredentialsEmail({
        to: normalizedEmail,
        name,
        password: plainPassword,
        designation: normalizedDesignation,
        branch: normalizedBranch,
      });
    } catch (emailError) {
      console.error("Employee credentials email failed:", emailError);
      return res.status(201).json({
        message: "Employee added successfully, but credentials email could not be sent.",
        warning: "SMTP delivery failed. Share the login credentials manually.",
        employee,
      });
    }

    res.status(201).json({
      message: "Employee added successfully. Login credentials sent to employee email.",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getEmployees = async (req, res) => {
  try {
    const scopedFiltersResult = applyEmployeeBranchScope(req, buildEmployeeFilters(req.query));
    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const filters = scopedFiltersResult.filters;
    const employees = await Employee.find(filters).sort({ createdAt: -1 });

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(employee.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only access employee records from your branch" });
      }
    }

    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const existingEmployee = await Employee.findById(req.params.id);
    if (!existingEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const payload = { ...req.body };
    if (typeof payload.phone !== "undefined") {
      payload.phone = normalizePhone(payload.phone);
      if (!TEN_DIGIT_PHONE_REGEX.test(payload.phone)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
      }
    }
    if (typeof payload.designation !== "undefined") {
      payload.designation = String(payload.designation).trim();
      if (!ALLOWED_DESIGNATIONS.includes(payload.designation)) {
        return res.status(400).json({
          message: "Designation must be one of: Employee, Branch Manager, Junior Manager",
        });
      }
    }
    if (typeof payload.role !== "undefined") {
      payload.role = String(payload.role).trim();
      if (!isManagementDesignation(payload.designation) && !ALLOWED_ROLES.includes(payload.role)) {
        return res.status(400).json({
          message: "Role must be one of: Mechanic, Sales Person, Receptionist, Delivery Man, Other",
        });
      }
      if (isManagementDesignation(payload.designation)) {
        payload.role = "";
      }
    }
    if (typeof payload.branch !== "undefined") {
      payload.branch = String(payload.branch).trim();
      if (!payload.branch) {
        return res.status(400).json({ message: "Branch is required" });
      }
    }
    if (typeof payload.email !== "undefined") {
      payload.email = normalizeEmail(payload.email);

      const duplicateEmployee = await Employee.findOne({
        email: payload.email,
        _id: { $ne: req.params.id },
      });
      if (duplicateEmployee) {
        return res.status(400).json({ message: "Employee with this email already exists" });
      }

      const linkedExistingUser = await User.findOne({ email: existingEmployee.email });
      const duplicateUserQuery = { email: payload.email };
      if (linkedExistingUser?._id) {
        duplicateUserQuery._id = { $ne: linkedExistingUser._id };
      }

      const duplicateUser = await User.findOne(duplicateUserQuery);
      if (duplicateUser) {
        return res.status(400).json({ message: "A login account with this email already exists" });
      }
    }
    if (typeof payload.salary !== "undefined") {
      payload.salary = Number(payload.salary);
    }

    const employee = await Employee.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const linkedUser = await User.findOne({ email: existingEmployee.email });
    if (linkedUser) {
      linkedUser.name = employee.name;
      linkedUser.email = employee.email;
      linkedUser.phone = employee.phone;
      linkedUser.designation = employee.designation;
      linkedUser.branch = employee.branch;
      linkedUser.role = isManagementDesignation(employee.designation) ? "manager" : "employee";
      await linkedUser.save();
    }

    res.status(200).json({ message: "Employee updated successfully", employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const accessResult = await ensureCanDeleteEmployee(req, employee);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ message: accessResult.message });
    }

    await Employee.findByIdAndDelete(req.params.id);

    await User.findOneAndDelete({ email: employee.email });

    res.status(200).json({ message: "Employee fired successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};