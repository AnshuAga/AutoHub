const BranchDetail = require("../models/BranchDetail");
const Vehicle = require("../models/Vehicle");
const Employee = require("../models/Employee");

const DEFAULT_BRANCHES = ["Main Branch", "Delhi", "Mumbai"];

const DEFAULT_BRANCH_LOCATIONS = {
  "Main Branch": "AutoHub HQ, Sector 18, Noida",
  Delhi: "Connaught Place, New Delhi",
  Mumbai: "Andheri West, Mumbai",
};

const toBranchKey = (value = "") => String(value || "").trim().toLowerCase();

const mapDetailsByBranch = (details = []) => {
  return details.reduce((accumulator, detail) => {
    accumulator[toBranchKey(detail.branchName)] = detail;
    return accumulator;
  }, {});
};

const isAdmin = (req) => String(req?.user?.role || "").toLowerCase() === "admin";

const getDefaultBranchLocation = (branchName = "") => {
  const normalizedBranchName = String(branchName || "").trim();

  return DEFAULT_BRANCH_LOCATIONS[normalizedBranchName] || `${normalizedBranchName || "Main Branch"} Showroom, India`;
};

const getBranchDetails = async (req, res) => {
  try {
    const [details, vehicles, employees] = await Promise.all([
      BranchDetail.find({}).sort({ branchName: 1 }),
      Vehicle.find({}).select("showroomBranch stock incomingStock"),
      Employee.find({}).select("_id name email designation branch"),
    ]);

    const detailByBranch = mapDetailsByBranch(details);

    const statsByBranch = vehicles.reduce((accumulator, vehicle) => {
      const branchName = String(vehicle.showroomBranch || "Main Branch").trim() || "Main Branch";
      const key = toBranchKey(branchName);

      if (!accumulator[key]) {
        accumulator[key] = {
          branchName,
          totalVehicles: 0,
          availableStock: 0,
          incomingStock: 0,
        };
      }

      accumulator[key].totalVehicles += 1;
      accumulator[key].availableStock += Number(vehicle.stock || 0);
      accumulator[key].incomingStock += Number(vehicle.incomingStock || 0);
      return accumulator;
    }, {});

    const employeeStatsByBranch = employees.reduce((accumulator, employee) => {
      const branchName = String(employee.branch || "Main Branch").trim() || "Main Branch";
      const key = toBranchKey(branchName);

      if (!accumulator[key]) {
        accumulator[key] = {
          branchName,
          totalEmployees: 0,
          managerCount: 0,
          managerCandidates: [],
        };
      }

      accumulator[key].totalEmployees += 1;

      if (String(employee.designation || "").toLowerCase() === "branch manager") {
        accumulator[key].managerCount += 1;
        accumulator[key].managerCandidates.push(employee);
      }

      return accumulator;
    }, {});

    const defaultBranchKeys = DEFAULT_BRANCHES.map((branchName) => toBranchKey(branchName));
    const allBranchKeys = [
      ...new Set([...defaultBranchKeys, ...Object.keys(statsByBranch), ...Object.keys(detailByBranch), ...Object.keys(employeeStatsByBranch)]),
    ];

    const response = allBranchKeys
      .map((key) => {
        const stats = statsByBranch[key] || {
          branchName:
            detailByBranch[key]?.branchName ||
            DEFAULT_BRANCHES.find((branchName) => toBranchKey(branchName) === key) ||
            "Main Branch",
          totalVehicles: 0,
          availableStock: 0,
          incomingStock: 0,
        };

        const detail = detailByBranch[key];
        const employeeStats = employeeStatsByBranch[key] || {
          totalEmployees: 0,
          managerCount: 0,
          managerCandidates: [],
        };

        const mappedManager = detail?.managerEmployeeId
          ? employeeStats.managerCandidates.find(
              (employee) => String(employee._id) === String(detail.managerEmployeeId)
            )
          : null;
        const branchManager = mappedManager || employeeStats.managerCandidates[0] || null;

        return {
          _id: detail?._id || null,
          branchName: stats.branchName,
          totalVehicles: stats.totalVehicles,
          availableStock: stats.availableStock,
          incomingStock: stats.incomingStock,
          address: detail?.address || "",
          location: detail?.location || getDefaultBranchLocation(stats.branchName),
          contactPhone: detail?.contactPhone || "",
          contactEmail: detail?.contactEmail || branchManager?.email || "",
          managerName: detail?.managerName || branchManager?.name || "",
          managerEmployeeId: detail?.managerEmployeeId || branchManager?._id || null,
          totalEmployees: Number(employeeStats.totalEmployees || 0),
          managerCount: Number(employeeStats.managerCount || 0),
          nonManagerEmployees: Math.max(0, Number(employeeStats.totalEmployees || 0) - Number(employeeStats.managerCount || 0)),
          notes: detail?.notes || "",
          updatedAt: detail?.updatedAt || null,
        };
      })
      .sort((a, b) => a.branchName.localeCompare(b.branchName));

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const upsertBranchDetail = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only admin can update branch details" });
    }

    const branchName = String(req.params.branchName || "").trim();
    if (!branchName) {
      return res.status(400).json({ message: "branchName is required" });
    }

    const payload = {
      branchName,
      address: String(req.body.address || "").trim(),
      location: String(req.body.location || getDefaultBranchLocation(branchName)).trim(),
      contactPhone: String(req.body.contactPhone || "").trim(),
      contactEmail: String(req.body.contactEmail || "").trim().toLowerCase(),
      managerName: String(req.body.managerName || "").trim(),
      managerEmployeeId: req.body.managerEmployeeId || null,
      notes: String(req.body.notes || "").trim(),
      updatedBy: req.user?._id || null,
    };

    const detail = await BranchDetail.findOneAndUpdate(
      { branchName: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      payload,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "Branch details updated successfully", detail });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBranchDetails,
  upsertBranchDetail,
};
