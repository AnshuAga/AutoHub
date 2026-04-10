import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = (user?.role || "").toLowerCase();

  if (!token) {
    alert("Please login first");
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.map((item) => item.toLowerCase()).includes(role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default ProtectedRoute;