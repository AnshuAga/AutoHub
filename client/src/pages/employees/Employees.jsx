import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";

function Employees() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = (user?.role || "customer").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canOpenEmployeeSection = isAdmin || isManager;

  const pageBackgroundStyle = {
    minHeight: "100vh",
    backgroundImage:
      'linear-gradient(rgba(7, 23, 38, 0.08), rgba(7, 23, 38, 0.08)), url("/gallery/employees.png")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "scroll",
  };

  const contentOverlayStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    margin: "20px",
    borderRadius: "16px",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
  };

  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [designation, setDesignation] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);

  const getDesignationBadgeClass = (value) =>
    ["Branch Manager", "Junior Manager"].includes(String(value || ""))
      ? "employee-badge employee-badge-manager"
      : "employee-badge employee-badge-employee";

  const fetchEmployees = async () => {
  try {
    const response = await api.get("/employees", {
      params: {
        q: searchTerm,
        designation,
        branch,
      },
    });
    setEmployees(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this employee?");
    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.delete(`/employees/${id}`);
      alert(response.data.message);
      fetchEmployees();
    } catch (error) {
      console.log(error);
    }
  };

  if (!canOpenEmployeeSection) {
    return null;
  }

  return (
    <div style={pageBackgroundStyle}>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container" style={contentOverlayStyle}>
          <h1>Employees</h1>
          {isAdmin || isManager ? (
            <div style={{ marginTop: "10px" }}>
              <Link to="/add-employee">
                <button className="primary-btn">Add Employee</button>
              </Link>
            </div>
          ) : null}
          <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search employee by name/email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "300px" }}
            />
            <select value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ width: "220px" }}>
              <option value="">All Designations</option>
              <option value="Employee">Employee</option>
              <option value="Branch Manager">Branch Manager</option>
              <option value="Junior Manager">Junior Manager</option>
            </select>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ width: "200px" }}>
              <option value="">All Branches</option>
              <option value="Main Branch">Main Branch</option>
              <option value="Delhi">Delhi</option>
              <option value="Mumbai">Mumbai</option>
            </select>
            <button
              className="primary-btn small-btn"
              onClick={() => {
                setLoading(true);
                fetchEmployees();
              }}
            >
              Search
            </button>
          </div>
          {loading ? (
            <p>Loading employees...</p>
          ) : employees.length > 0 ? (
            <div className="employee-card-grid">
              {employees.map((employee) => {
                const initials = (employee.name || "E")
                  .split(" ")
                  .map((part) => part.charAt(0))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div key={employee._id} className="card employee-card">
                    <div className="employee-card-head">
                      <div className="employee-avatar">
                        {employee.employeeImage ? (
                          <img src={employee.employeeImage} alt={employee.name} className="employee-avatar-image" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      <div>
                        <h3 style={{ margin: 0 }}>{employee.name}</h3>
                        <div className="employee-badge-row">
                          <span className={getDesignationBadgeClass(employee.designation)}>{employee.designation || "Employee"}</span>
                          <span className="employee-badge employee-badge-branch">{employee.branch || "No Branch"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="employee-meta-grid">
                      <div>
                        <span>Email</span>
                        <strong>{employee.email}</strong>
                      </div>
                      <div>
                        <span>Phone</span>
                        <strong>{employee.phone}</strong>
                      </div>
                      <div>
                        <span>Branch</span>
                        <strong>{employee.branch || "-"}</strong>
                      </div>
                      <div>
                        <span>Role</span>
                        <strong>{employee.role || (["Branch Manager", "Junior Manager"].includes(employee.designation) ? "-" : "Sales Person")}</strong>
                      </div>
                      <div>
                        <span>Salary</span>
                        <strong>{employee.salary}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                      {isAdmin ? (
                        <Link to={`/edit-employee/${employee._id}`}>
                          <button className="primary-btn small-btn">Edit</button>
                        </Link>
                      ) : null}

                      {isAdmin || (isManager && employee.designation === "Employee" && employee.email !== user?.email) ? (
                        <button className="danger-btn small-btn" onClick={() => handleDelete(employee._id)}>
                          Fire Employee
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", marginTop: "20px" }}>
              <h3 style={{ marginTop: 0 }}>No employees found</h3>
              <p>Try another search or clear filters.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Employees;