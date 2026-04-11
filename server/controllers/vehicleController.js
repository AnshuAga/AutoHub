const Vehicle = require("../models/Vehicle");
const Employee = require("../models/Employee");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_SCOPED_ROLES = ["manager", "employee"];

const normalizeStringArray = (value) => {
  if (!value) {
    return [];
  }

  const arrayValue = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(arrayValue.map((item) => String(item || "").trim()).filter(Boolean))];
};

const normalizeImageArray = (value) => {
  if (!value) {
    return [];
  }

  const arrayValue = Array.isArray(value) ? value : [value];
  return [...new Set(arrayValue.map((item) => String(item || "").trim()).filter(Boolean))];
};

const normalizeVariantStocks = (value) => {
  if (!value) {
    return [];
  }

  const arrayValue = Array.isArray(value) ? value : [];
  const deduped = new Map();

  arrayValue.forEach((item) => {
    const variant = String(item?.variant || "").trim();
    if (!variant) {
      return;
    }

    const nextStock = Number(item?.stock);
    const stock = Number.isFinite(nextStock) && nextStock > 0 ? Math.floor(nextStock) : 0;
    deduped.set(variant.toLowerCase(), { variant, stock });
  });

  return Array.from(deduped.values());
};

const syncVariantStocksWithOptions = (variantStocks, variantOptions) => {
  if (!Array.isArray(variantOptions) || variantOptions.length === 0) {
    return [];
  }

  const existingByKey = new Map(
    (Array.isArray(variantStocks) ? variantStocks : []).map((entry) => [
      String(entry.variant || "").trim().toLowerCase(),
      entry,
    ])
  );

  return variantOptions.map((variantName) => {
    const key = String(variantName || "").trim().toLowerCase();
    const existing = existingByKey.get(key);
    return {
      variant: variantName,
      stock: Number(existing?.stock || 0),
    };
  });
};

const getTotalVariantStock = (variantStocks) =>
  (Array.isArray(variantStocks) ? variantStocks : []).reduce(
    (total, entry) => total + Number(entry?.stock || 0),
    0
  );

const getUserRole = (req) => String(req?.user?.role || "").toLowerCase();
const getUserDesignation = (req) => {
  const employeeRole = String(req?.user?.employeeRole || "").toLowerCase().trim();
  const designation = String(req?.user?.designation || "").toLowerCase().trim();
  const role = String(req?.user?.role || "").toLowerCase().trim();

  if (employeeRole) {
    return employeeRole === "deliveryman" ? "delivery man" : employeeRole;
  }

  if (designation && designation !== "employee" && designation !== "branch manager") {
    return designation === "deliveryman" ? "delivery man" : designation;
  }

  if (role === "delivery man" || role === "deliveryman" || role === "mechanic") {
    return role === "deliveryman" ? "delivery man" : role;
  }

  return designation;
};
const isTeamScopedRole = (req) => TEAM_SCOPED_ROLES.includes(getUserRole(req));
const getRequiredUserBranch = (req) => String(req?.user?.branch || "").trim();

const getLinkedEmployee = async (req) => {
  const userName = String(req?.user?.name || "").trim();
  const userEmail = String(req?.user?.email || "").trim();
  const userBranch = String(req?.user?.branch || "").trim();

  if (!userName && !userEmail) {
    return null;
  }

  return Employee.findOne({
    $or: [
      { email: new RegExp(`^${escapeRegex(userEmail)}$`, "i") },
      { name: new RegExp(`^${escapeRegex(userName)}$`, "i") },
    ],
    ...(userBranch ? { branch: new RegExp(`^${escapeRegex(userBranch)}$`, "i") } : {}),
  }).select("_id name email role designation branch");
};

const validateAssignableEmployee = async (req, employeeId, assignmentType) => {
  const normalizedEmployeeId = String(employeeId || "").trim();
  if (!normalizedEmployeeId) {
    return { ok: false, status: 400, message: "Assigned employee is required" };
  }

  const employee = await Employee.findById(normalizedEmployeeId).select("_id name role designation branch");
  if (!employee) {
    return { ok: false, status: 404, message: "Employee not found" };
  }

  const normalizedAssignmentType = String(assignmentType || "").trim().toLowerCase();
  if (!['repair', 'delivery'].includes(normalizedAssignmentType)) {
    return { ok: false, status: 400, message: "assignmentType must be either 'Repair' or 'Delivery'" };
  }

  const employeeRole = String(employee.role || "").toLowerCase();
  if (normalizedAssignmentType === 'repair' && employeeRole !== 'mechanic') {
    return { ok: false, status: 400, message: "Selected employee is not a mechanic" };
  }

  if (normalizedAssignmentType === 'delivery' && employeeRole !== 'delivery man') {
    return { ok: false, status: 400, message: "Selected employee is not a delivery man" };
  }

  if (isTeamScopedRole(req)) {
    const userBranch = getRequiredUserBranch(req);
    if (!userBranch) {
      return { ok: false, status: 403, message: "Your account is missing branch mapping" };
    }

    if (String(employee.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
      return { ok: false, status: 403, message: "You can only assign vehicles to employees in your branch" };
    }
  }

  return { ok: true, employee };
};

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
    brand,
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
    filters.$or = [
      { vehicleName: regex },
      { brand: regex },
      { category: regex },
      { modelColor: regex },
      { variant: regex },
    ];
  }
  if (brand) {
    filters.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
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
      category,
      brand,
      modelYear,
      modelColor,
      variant,
      variantOptions,
      variantStocks,
      colorOptions,
      showroomBranch,
      stock,
      incomingStock,
      status,
      isRepaired,
      repairedDescription,
      price,
      vehicleImage,
      vehicleImages,
    } = req.body;

    if (!vehicleName || !price) {
      return res.status(400).json({ message: "vehicleName and price are required" });
    }

    const scopedBranch = isTeamScopedRole(req) ? getRequiredUserBranch(req) : showroomBranch;

    if (isTeamScopedRole(req) && !scopedBranch) {
      return res.status(403).json({ message: "Your account is missing branch mapping" });
    }

    const normalizedVehicleImages = normalizeImageArray(vehicleImages);
    const normalizedVariantOptions = normalizeStringArray(variantOptions);
    const normalizedVariantStocks = syncVariantStocksWithOptions(
      normalizeVariantStocks(variantStocks),
      normalizedVariantOptions
    );
    const resolvedStock =
      normalizedVariantStocks.length > 0
        ? getTotalVariantStock(normalizedVariantStocks)
        : Number(stock || 0);
    const primaryImage = String(vehicleImage || normalizedVehicleImages[0] || "").trim();

    const vehicle = await Vehicle.create({
      variant: String(variant || "").trim(),
      modelColor: String(modelColor || "").trim(),
      variantOptions: normalizedVariantOptions,
      variantStocks: normalizedVariantStocks,
      colorOptions: normalizeStringArray(colorOptions),
      vehicleName,
      category,
      brand,
      modelYear,
      showroomBranch: scopedBranch,
      stock: resolvedStock,
      incomingStock: Math.max(0, Number(incomingStock || 0)),
      status,
      isRepaired,
      repairedDescription,
      price: Number(price),
      vehicleImage: primaryImage,
      vehicleImages: normalizedVehicleImages.length > 0
        ? normalizedVehicleImages
        : (primaryImage ? [primaryImage] : []),
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
    if (typeof payload.incomingStock !== "undefined") {
      payload.incomingStock = Math.max(0, Number(payload.incomingStock || 0));
    }
    if (typeof payload.modelYear !== "undefined") {
      payload.modelYear = Number(payload.modelYear);
    }
    if (typeof payload.variantOptions !== "undefined") {
      payload.variantOptions = normalizeStringArray(payload.variantOptions);
    }
    if (typeof payload.variantStocks !== "undefined") {
      payload.variantStocks = normalizeVariantStocks(payload.variantStocks);
    }
    if (Array.isArray(payload.variantOptions)) {
      payload.variantStocks = syncVariantStocksWithOptions(payload.variantStocks, payload.variantOptions);
      if (payload.variantStocks.length > 0) {
        payload.stock = getTotalVariantStock(payload.variantStocks);
      }
    }
    if (typeof payload.colorOptions !== "undefined") {
      payload.colorOptions = normalizeStringArray(payload.colorOptions);
    }
    if (typeof payload.vehicleImages !== "undefined") {
      payload.vehicleImages = normalizeImageArray(payload.vehicleImages);
      if (typeof payload.vehicleImage === "undefined") {
        payload.vehicleImage = payload.vehicleImages[0] || "";
      }
    }
    if (typeof payload.vehicleImage !== "undefined" && typeof payload.vehicleImages === "undefined") {
      const singleImage = String(payload.vehicleImage || "").trim();
      payload.vehicleImages = singleImage ? [singleImage] : [];
      payload.vehicleImage = singleImage;
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

const assignVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { assignToEmployeeId, assignmentType, assignmentNotes } = req.body;
    const normalizedAssignmentType = String(assignmentType || "").trim();

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const employeeResult = await validateAssignableEmployee(req, assignToEmployeeId, normalizedAssignmentType);
    if (!employeeResult.ok) {
      return res.status(employeeResult.status).json({ message: employeeResult.message });
    }

    const employee = employeeResult.employee;

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

      // Branch Manager can only assign to employees in their branch
      if (String(employee.branch || "").toLowerCase() !== userBranch.toLowerCase()) {
        return res.status(403).json({ message: "You can only assign vehicles to employees in your branch" });
      }
    }

    if (!['Repair', 'Delivery'].includes(normalizedAssignmentType)) {
      return res.status(400).json({ message: "assignmentType must be either 'Repair' or 'Delivery'" });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        assignedTo: assignToEmployeeId,
        assignmentType: normalizedAssignmentType,
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
    const designation = getUserDesignation(req);

    // Only mechanics and delivery men can view their assigned vehicles
    if (!["mechanic", "delivery man"].includes(String(designation || "").toLowerCase())) {
      return res.status(403).json({ message: "Only mechanics and delivery men can view assigned vehicles" });
    }

    const linkedEmployee = await getLinkedEmployee(req);
    if (!linkedEmployee) {
      return res.status(403).json({ message: "Your account is not linked to an employee record" });
    }

    const filters = {
      assignedTo: linkedEmployee._id,
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
