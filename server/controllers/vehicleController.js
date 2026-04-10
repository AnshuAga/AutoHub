const Vehicle = require("../models/Vehicle");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();

const applyVehicleBranchScope = (req, filters) => {
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
      showroomBranch: new RegExp(`^${escapeRegex(userBranch)}$`, "i"),
    },
  };
};

const buildVehicleFilters = (query = {}) => {
  const {
    q,
    type,
    category,
    status,
    branch,
    isRepaired,
    minPrice,
    maxPrice,
  } = query;
  const filters = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filters.$or = [{ vehicleName: regex }, { brand: regex }, { type: regex }];
  }
  if (type) {
    filters.type = new RegExp(`^${escapeRegex(type)}$`, "i");
  }
  if (category) {
    filters.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  }
  if (status) {
    filters.status = new RegExp(`^${escapeRegex(status)}$`, "i");
  }
  if (branch) {
    filters.showroomBranch = new RegExp(escapeRegex(branch), "i");
  }
  if (typeof isRepaired !== "undefined") {
    filters.isRepaired = isRepaired === "true";
  }

  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) {
      filters.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      filters.price.$lte = Number(maxPrice);
    }
  }

  return filters;
};

const addVehicle = async (req, res) => {
  try {
    const {
      vehicleName,
      type,
      category,
      brand,
      modelYear,
      showroomBranch,
      stock,
      status,
      isRepaired,
      repairedDescription,
      price,
      vehicleImage,
    } = req.body;

    if (!vehicleName || !type || !price) {
      return res.status(400).json({ message: "vehicleName, type and price are required" });
    }

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : showroomBranch;

    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    const vehicle = await Vehicle.create({
      vehicleName,
      type,
      category,
      brand,
      modelYear,
      showroomBranch: scopedBranch,
      stock,
      status,
      isRepaired,
      repairedDescription,
      price: Number(price),
      vehicleImage,
    });

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getVehicles = async (req, res) => {
  try {
    const scopedFiltersResult = applyVehicleBranchScope(req, buildVehicleFilters(req.query));
    if (!scopedFiltersResult.ok) {
      return res.status(scopedFiltersResult.status).json({ message: scopedFiltersResult.message });
    }

    const filters = scopedFiltersResult.filters;
    const vehicles = await Vehicle.find(filters).sort({ createdAt: -1 });

    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(vehicle.showroomBranch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only access vehicles from your branch" });
      }
    }

    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(vehicle.showroomBranch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only delete vehicles from your branch" });
      }
    }

    await Vehicle.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const updateVehicle = async (req, res) => {
  try {
    const existingVehicle = await Vehicle.findById(req.params.id);
    if (!existingVehicle) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    if (isTeamScopedRole(req)) {
      const userBranch = getRequiredUserBranch(req);
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(existingVehicle.showroomBranch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only update vehicles from your branch" });
      }
    }

    const payload = { ...req.body };

    if (typeof payload.price !== "undefined") {
      payload.price = Number(payload.price);
    }
    if (typeof payload.stock !== "undefined") {
      payload.stock = Number(payload.stock);
    }
    if (typeof payload.modelYear !== "undefined") {
      payload.modelYear = Number(payload.modelYear);
    }

    if (isTeamScopedRole(req)) {
      payload.showroomBranch = getRequiredUserBranch(req);
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Vehicle updated successfully",
      vehicle,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const Employee = require("../models/Employee");

const assignVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { assignToEmployeeId, assignmentType, assignmentNotes } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const employee = await Employee.findById(assignToEmployeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check authorization: Admin or Branch Manager can assign
    const userRole = String(req?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    
    if (!isAdmin) {
      if (userRole !== "manager") {
        return res.status(403).json({ message: "Only admin or branch manager can assign vehicles" });
      }
      
      const userBranch = String(req?.user?.branch || "").trim();
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      // Branch Manager can only assign to mechanics in their branch
      if (String(employee.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only assign vehicles to employees in your branch" });
      }
    }

    if (!["Repair", "Delivery"].includes(assignmentType)) {
      return res.status(400).json({ message: "assignmentType must be either 'Repair' or 'Delivery'" });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        assignedTo: assignToEmployeeId,
        assignmentType: assignmentType,
        assignedDate: new Date(),
        assignmentNotes: assignmentNotes || "",
      },
      { new: true }
    ).populate("assignedTo", "name email role branch");

    res.status(200).json({
      message: "Vehicle assigned successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unassignVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Check authorization
    const userRole = String(req?.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";

    if (!isAdmin) {
      if (userRole !== "manager") {
        return res.status(403).json({ message: "Only admin or branch manager can unassign vehicles" });
      }

      const userBranch = String(req?.user?.branch || "").trim();
      if (!userBranch) {
        return res.status(403).json({ message: "Your account is missing branch mapping" });
      }

      if (String(vehicle.showroomBranch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only unassign vehicles from your branch" });
      }
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        assignedTo: null,
        assignmentType: null,
        assignedDate: null,
        assignmentNotes: "",
      },
      { new: true }
    );

    res.status(200).json({
      message: "Vehicle unassigned successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAssignedVehicles = async (req, res) => {
  try {
    const { role, _id: userId, branch } = req.user;

    // Only mechanics and delivery men can view their assigned vehicles
    if (!["mechanic", "deliveryman", "delivery man"].includes(String(role || "").toLowerCase())) {
      return res.status(403).json({ message: "Only mechanics and delivery men can view assigned vehicles" });
    }

    const filters = {
      assignedTo: userId,
    };

    const vehicles = await Vehicle.find(filters)
      .populate("assignedTo", "name email role branch")
      .sort({ assignedDate: -1 });

    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addVehicle,
  getVehicles,
  getVehicleById,
  deleteVehicle,
  updateVehicle,
  assignVehicle,
  unassignVehicle,
  getAssignedVehicles,
};
