import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

const DEFAULT_BRANCHES = ["Main Branch", "Delhi", "Mumbai"];

const DEFAULT_BRANCH_LOCATIONS = {
  "Main Branch": "AutoHub HQ, Sector 18, Noida",
  Delhi: "Connaught Place, New Delhi",
  Mumbai: "Andheri West, Mumbai",
};

const branchKey = (value = "") => String(value || "").trim().toLowerCase();

const getDefaultBranchLocation = (branchName = "") => {
  const normalizedBranchName = String(branchName || "").trim();

  return DEFAULT_BRANCH_LOCATIONS[normalizedBranchName] || `${normalizedBranchName || "Main Branch"} Showroom, India`;
};

function BranchDetails() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [editForm, setEditForm] = useState({
    address: "",
    contactPhone: "",
    contactEmail: "",
    managerName: "",
    managerEmployeeId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const buildFallbackBranches = (vehicles = []) => {
    const grouped = vehicles.reduce((accumulator, vehicle) => {
      const branchName = String(vehicle.showroomBranch || "Main Branch").trim() || "Main Branch";

      if (!accumulator[branchName]) {
        accumulator[branchName] = {
          _id: null,
          branchName,
          totalVehicles: 0,
          availableStock: 0,
          incomingStock: 0,
          address: "",
          location: getDefaultBranchLocation(branchName),
          contactPhone: "",
          contactEmail: "",
          managerName: "",
          notes: "",
          updatedAt: null,
        };
      }

      accumulator[branchName].totalVehicles += 1;
      accumulator[branchName].availableStock += Number(vehicle.stock || 0);
      accumulator[branchName].incomingStock += Number(vehicle.incomingStock || 0);
      return accumulator;
    }, {});

    DEFAULT_BRANCHES.forEach((branchName) => {
      if (!grouped[branchName]) {
        grouped[branchName] = {
          _id: null,
          branchName,
          totalVehicles: 0,
          availableStock: 0,
          incomingStock: 0,
          address: "",
          location: getDefaultBranchLocation(branchName),
          contactPhone: "",
          contactEmail: "",
          managerName: "",
          managerEmployeeId: null,
          notes: "",
          updatedAt: null,
        };
      }
    });

    return Object.values(grouped).sort((a, b) => a.branchName.localeCompare(b.branchName));
  };

  const fetchBranchDetails = async () => {
    try {
      setLoading(true);
      setApiUnavailable(false);
      const response = await api.get("/branches");
      setBranches(response.data || []);
    } catch (error) {
      try {
        const vehicleResponse = await api.get("/vehicles");
        setBranches(buildFallbackBranches(vehicleResponse.data || []));
        setApiUnavailable(true);
      } catch (fallbackError) {
        console.log(fallbackError);
        setBranches([]);
        setApiUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchDetails();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get("/employees");
        setEmployees(response.data || []);
      } catch {
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!selectedBranch) {
      setEditForm({
        address: "",
        location: getDefaultBranchLocation("Main Branch"),
        contactPhone: "",
        contactEmail: "",
        managerName: "",
        managerEmployeeId: "",
        notes: "",
      });
      return;
    }

    const branch = branches.find((item) => item.branchName === selectedBranch);
    const mappedManager = employees.find(
      (employee) => String(employee._id) === String(branch?.managerEmployeeId || "")
    );
    const branchManagerFromEmployees = employees.find(
      (employee) =>
        branchKey(employee.branch) === branchKey(selectedBranch) &&
        String(employee.designation || "").toLowerCase() === "branch manager"
    );
    const resolvedManager = mappedManager || branchManagerFromEmployees || null;

    setEditForm({
      address: branch?.address || "",
      location: branch?.location || getDefaultBranchLocation(selectedBranch),
      contactPhone: branch?.contactPhone || resolvedManager?.phone || "",
      contactEmail: branch?.contactEmail || resolvedManager?.email || "",
      managerName: branch?.managerName || resolvedManager?.name || "",
      managerEmployeeId: branch?.managerEmployeeId || resolvedManager?._id || "",
      notes: branch?.notes || "",
    });
  }, [selectedBranch, branches, employees]);

  const employeesForDropdown = useMemo(() => {
    return [...employees].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [employees]);

  const handleManagerChange = (employeeId) => {
    const selectedManager = employeesForDropdown.find((employee) => String(employee._id) === employeeId);
    if (!selectedManager) {
      setEditForm((current) => ({
        ...current,
        managerEmployeeId: "",
      }));
      return;
    }

    setEditForm((current) => ({
      ...current,
      managerEmployeeId: String(selectedManager._id),
      managerName: selectedManager.name || current.managerName,
      contactPhone: selectedManager.phone || current.contactPhone,
      contactEmail: selectedManager.email || current.contactEmail,
    }));
  };

  const summary = useMemo(() => {
    return branches.reduce(
      (accumulator, branch) => {
        accumulator.totalBranches += 1;
        accumulator.totalVehicles += Number(branch.totalVehicles || 0);
        accumulator.availableStock += Number(branch.availableStock || 0);
        accumulator.incomingStock += Number(branch.incomingStock || 0);
        return accumulator;
      },
      { totalBranches: 0, totalVehicles: 0, availableStock: 0, incomingStock: 0 }
    );
  }, [branches]);

  const branchManagerLookup = useMemo(() => {
    return employees.reduce((accumulator, employee) => {
      const key = branchKey(employee.branch || "Main Branch");
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(employee);
      return accumulator;
    }, {});
  }, [employees]);

  const getResolvedManagerDisplay = (branch) => {
    if (branch?.managerName) {
      return branch.managerName;
    }

    const employeesInBranch = branchManagerLookup[branchKey(branch?.branchName)] || [];
    const branchManager = employeesInBranch.find(
      (employee) => String(employee.designation || "").toLowerCase() === "branch manager"
    );

    if (branchManager?.name) {
      return branchManager.name;
    }

    return "-";
  };

  const getResolvedEmailDisplay = (branch) => {
    if (branch?.contactEmail) {
      return branch.contactEmail;
    }

    const employeesInBranch = branchManagerLookup[branchKey(branch?.branchName)] || [];

    const mappedManager = employeesInBranch.find(
      (employee) => String(employee._id) === String(branch?.managerEmployeeId || "")
    );
    if (mappedManager?.email) {
      return mappedManager.email;
    }

    const branchManager = employeesInBranch.find(
      (employee) => String(employee.designation || "").toLowerCase() === "branch manager"
    );

    return branchManager?.email || "-";
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedBranch) {
      alert("Please select a branch first");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put(`/branches/${encodeURIComponent(selectedBranch)}`, editForm);
      alert(response.data?.message || "Branch details updated");
      await fetchBranchDetails();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update branch details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <h1>Branch Details</h1>
          <p style={{ marginTop: 0 }}>View branch-level inventory details. Admin can maintain branch contact information.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "14px" }}>
            <div className="card" style={{ margin: 0 }}>
              <strong>Branches</strong>
              <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800 }}>{summary.totalBranches}</p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <strong>Total Vehicles</strong>
              <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800 }}>{summary.totalVehicles}</p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <strong>Available Stock</strong>
              <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800 }}>{summary.availableStock}</p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <strong>Incoming Stock</strong>
              <p style={{ margin: "8px 0 0", fontSize: "24px", fontWeight: 800 }}>{summary.incomingStock}</p>
            </div>
          </div>

          {loading ? (
            <p>Loading branch details...</p>
          ) : (
            <div className="card" style={{ marginBottom: "14px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Branch</th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Location</th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Manager</th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Vehicles</th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Available</th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Incoming</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                      <tr key={branch.branchName}>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{branch.branchName}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{branch.location || getDefaultBranchLocation(branch.branchName)}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{getResolvedManagerDisplay(branch)}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{getResolvedEmailDisplay(branch)}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{branch.totalVehicles}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{branch.availableStock}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>{branch.incomingStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card" style={{ opacity: isAdmin ? 1 : 0.92 }}>
            <h3 style={{ marginTop: 0 }}>Branch Information {isAdmin ? "(Admin Edit)" : "(View Only)"}</h3>

            <form onSubmit={handleSave} className="form-container" style={{ maxWidth: "none", boxShadow: "none", border: "none", padding: 0 }}>
              <div style={{ marginBottom: "12px" }}>
                <label>Select Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(event) => setSelectedBranch(event.target.value)}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.branchName} value={branch.branchName}>{branch.branchName}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Select Branch Manager (From Employees)</label>
                <select
                  value={editForm.managerEmployeeId}
                  onChange={(event) => handleManagerChange(event.target.value)}
                  disabled={!isAdmin || !selectedBranch}
                >
                  <option value="">Select manager</option>
                  {employeesForDropdown.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} - {employee.branch || "Main Branch"} ({employee.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Manager Name</label>
                <input
                  type="text"
                  value={editForm.managerName}
                  onChange={(event) => setEditForm((current) => ({ ...current, managerName: event.target.value }))}
                  disabled={!isAdmin || !selectedBranch}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Contact Phone</label>
                <input
                  type="text"
                  value={editForm.contactPhone}
                  onChange={(event) => setEditForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  disabled={!isAdmin || !selectedBranch}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Contact Email</label>
                <input
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(event) => setEditForm((current) => ({ ...current, contactEmail: event.target.value }))}
                  disabled={!isAdmin || !selectedBranch}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                  disabled={!isAdmin || !selectedBranch}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  disabled
                  readOnly
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                  disabled={!isAdmin || !selectedBranch}
                />
              </div>

              {isAdmin ? (
                <button type="submit" className="primary-btn" disabled={saving || !selectedBranch || apiUnavailable}>
                  {saving ? "Saving..." : "Save Branch Details"}
                </button>
              ) : (
                <div className="auth-status auth-status-info" style={{ margin: 0 }}>
                  Admin can edit branch information. You can view details here.
                </div>
              )}
              {apiUnavailable ? (
                <div className="auth-status auth-status-info" style={{ marginTop: "10px" }}>
                  Branch API is unavailable. Viewing fallback branch data from vehicles only.
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default BranchDetails;
