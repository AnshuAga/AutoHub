const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");

const TEAM_SCOPED_ROLES = ["manager", "employee"];

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    const userRole = String(user.role || "").toLowerCase();
    if (TEAM_SCOPED_ROLES.includes(userRole)) {
      const linkedEmployee = await Employee.findOne({
        $or: [
          { email: user.email.toLowerCase() },
          { name: new RegExp(`^${String(user?.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ],
      }).select("designation role branch");

      let shouldSave = false;

      if (linkedEmployee?.branch && !String(user.branch || "").trim()) {
        user.branch = linkedEmployee.branch;
        shouldSave = true;
      }

      if (userRole === "employee") {
        const currentDesignation = String(user.designation || "").toLowerCase().trim();
        if (!currentDesignation || currentDesignation === "employee") {
          const resolvedDesignation = linkedEmployee?.role || linkedEmployee?.designation || "";
          if (resolvedDesignation) {
            user.designation = resolvedDesignation;
            shouldSave = true;
          }
        }
      } else if (!String(user.designation || "").trim() && linkedEmployee?.designation) {
        user.designation = linkedEmployee.designation;
        shouldSave = true;
      }

      user.employeeRole = linkedEmployee?.role || "";

      if (shouldSave) {
        await user.save();
      }
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

module.exports = { protect };
