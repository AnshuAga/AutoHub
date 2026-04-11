import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

const getSidebarIcon = (route) => {
  const iconByRoute = {
    "/dashboard": "\u{1F4CA}",
    "/vehicles": "\u{1F697}",
    "/bookings": "\u{1F4C5}",
    "/service-bookings": "\u{1F527}",
    "/service-categories": "\u{1F4CB}",
    "/deliveries": "\u{1F69A}",
    "/customers": "\u{1F465}",
    "/payments": "\u{1F4B3}",
    "/employees": "\u{1F46E}",
    "/reports": "\u{1F4C8}",
    "/profile": "\u{1F464}",
    "/feedback": "\u{1F4AC}",
    "/settings": "\u{2699}\u{FE0F}",
    "/branches": "\u{1F3E2}",
  };

  return iconByRoute[route] || "\u{25B8}";
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener("user-updated", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("user-updated", syncUser);
    };
  }, []);

  const role = String(user?.role || "customer").toLowerCase().trim();
  const rawDesignation = String(user?.designation || "").toLowerCase().trim();
  const employeeRole = String(user?.employeeRole || "").toLowerCase().trim();
  const normalizedRole = role === "deliveryman" ? "delivery man" : role;
  const normalizedDesignation = rawDesignation === "deliveryman" ? "delivery man" : rawDesignation;
  const staffRole =
    (employeeRole === "deliveryman" ? "delivery man" : employeeRole) ||
    (normalizedDesignation && normalizedDesignation !== "employee" && normalizedDesignation !== "branch manager"
      ? normalizedDesignation
      : normalizedRole === "mechanic" || normalizedRole === "delivery man"
        ? normalizedRole
        : "");
  const isMechanic = staffRole === "mechanic";
  const isDeliveryMan = staffRole === "delivery man";
  const initials = (user?.name || normalizedRole)
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const menuSections = {
    customer: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/vehicles", label: "Vehicle Inventory" },
      { to: "/bookings", label: "My Bookings" },
      { to: "/service-bookings", label: "My Services" },
      { to: "/deliveries", label: "My Deliveries" },
      { to: "/payments", label: "My Payments" },
      { to: "/profile", label: "Profile" },
      { to: "/branches", label: "Branch Details" },
      { to: "/feedback", label: "Feedback" },
      { to: "/settings", label: "Settings" },
    ],
    employee: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/vehicles", label: "Vehicles" },
      { to: "/bookings", label: "Bookings" },
      { to: "/service-bookings", label: "Service Bookings" },
      { to: "/deliveries", label: "Deliveries" },
      { to: "/customers", label: "Customers" },
      { to: "/branches", label: "Branch Details" },
      { to: "/profile", label: "Profile" },
      { to: "/feedback", label: "Feedback" },
      { to: "/settings", label: "Settings" },
    ],
    mechanic: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/vehicles", label: "Vehicles" },
      { to: "/service-bookings", label: "Service Bookings" },
      { to: "/branches", label: "Branch Details" },
      { to: "/profile", label: "Profile" },
      { to: "/feedback", label: "Feedback" },
      { to: "/settings", label: "Settings" },
    ],
    deliveryMan: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/deliveries", label: "Deliveries" },
      { to: "/branches", label: "Branch Details" },
      { to: "/profile", label: "Profile" },
      { to: "/feedback", label: "Feedback" },
      { to: "/settings", label: "Settings" },
    ],
    manager: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/vehicles", label: "Vehicles" },
      { to: "/service-bookings", label: "Service Bookings" },
      { to: "/service-categories", label: "Service Categories" },
      { to: "/bookings", label: "Bookings" },
      { to: "/deliveries", label: "Deliveries" },
      { to: "/customers", label: "Customers" },
      { to: "/payments", label: "Payments" },
      { to: "/employees", label: "Employees" },
      { to: "/branches", label: "Branch Details" },
      { to: "/reports", label: "Reports" },
      { to: "/profile", label: "Profile" },
      { to: "/feedback", label: "Feedback" },
      { to: "/settings", label: "Settings" },
    ],
    admin: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/service-bookings", label: "Service Bookings" },
      { to: "/service-categories", label: "Service Categories" },
      { to: "/vehicles", label: "Vehicles" },
      { to: "/bookings", label: "Bookings" },
      { to: "/deliveries", label: "Deliveries" },
      { to: "/customers", label: "Customers" },
      { to: "/payments", label: "Payments" },
      { to: "/employees", label: "Employees" },
      { to: "/branches", label: "Branch Details" },
      { to: "/reports", label: "Reports" },
      { to: "/profile", label: "Profile" },
      { to: "/feedback", label: "Feedback" },
      { to: "/settings", label: "Settings" },
    ],
  };

  const menuKey = isDeliveryMan ? "deliveryMan" : isMechanic ? "mechanic" : normalizedRole;
  const visibleLinks = menuSections[menuKey] || menuSections.customer;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-updated"));
    navigate("/login");
  };

  return (
    <div
      style={{
        width: "250px",
        minHeight: "100vh",
        backgroundColor: "#1e293b",
        color: "white",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
      }}
    >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: normalizedRole === "customer"
                ? "linear-gradient(135deg, #0f766e, #14b8a6)"
                : normalizedRole === "employee"
                  ? "linear-gradient(135deg, #2563eb, #60a5fa)"
                  : normalizedRole === "manager"
                    ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                    : "linear-gradient(135deg, #0f4c81, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "white",
              fontSize: "14px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "white" }}>{user?.name || staffRole || normalizedRole} </h2>
            <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: "13px" }}>
              {(staffRole || normalizedRole).toUpperCase()} Menu
            </p>
          </div>
        </div>

      {visibleLinks.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`sidebar-link ${location.pathname === item.to ? "active-link" : ""}`}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            {getSidebarIcon(item.to)}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}

      <button
        onClick={handleLogout}
        className="danger-btn logout-btn sidebar-logout-btn"
      >
        <span className="logout-icon" aria-hidden="true">
          ↩
        </span>
        Logout
      </button>
    </div>
  );
}

export default Sidebar;