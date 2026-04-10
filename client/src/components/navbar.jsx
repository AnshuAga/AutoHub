import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <nav
      style={{
        backgroundColor: "#1e293b",
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(148, 163, 184, 0.28)",
        boxShadow: "0 8px 24px rgba(2, 6, 23, 0.35)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <Link
        to="/"
        className="brand-link"
        style={{ display: "inline-flex", alignItems: "center" }}
        aria-label="AutoHub home"
      >
        <img src="/autohub-logo.svg" alt="AutoHub" className="autohub-logo" />
      </Link>

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <Link to="/" style={{ color: "#f8fafc", textDecoration: "none", fontWeight: 600 }}>
          Home
        </Link>

        {!token && (
          <>
            <Link to="/login" style={{ color: "#f8fafc", textDecoration: "none", fontWeight: 600 }}>
              Login
            </Link>

            <Link
              to="/register"
              style={{ color: "#f8fafc", textDecoration: "none", fontWeight: 600 }}
            >
              Register
            </Link>
          </>
        )}

        {token && (
          <>
            <Link
              to="/dashboard"
              style={{ color: "#f8fafc", textDecoration: "none", fontWeight: 600 }}
            >
              Dashboard
            </Link>

            <button onClick={handleLogout} className="danger-btn small-btn logout-btn" title="Sign out">
              <span className="logout-icon" aria-hidden="true">
                ↩
              </span>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;