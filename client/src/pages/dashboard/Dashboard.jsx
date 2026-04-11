import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
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
  const isCustomer = normalizedRole === "customer";
  const isAdmin = normalizedRole === "admin";
  const isMechanic = staffRole === "mechanic";
  const isDeliveryMan = staffRole === "delivery man";
  const showRevenue = isCustomer || isAdmin || normalizedRole === "manager";
  const isCompletedPayment = (payment) => {
    const normalizedStatus = String(payment?.status || "").toLowerCase().trim();
    return normalizedStatus === "completed" || normalizedStatus === "paid";
  };
  const [stats, setStats] = useState({
  vehicles: 0,
  customers: 0,
  bookings: 0,
  serviceBookings: 0,
  deliveries: 0,
  payments: 0,
  employees: 0,
  totalRevenue: 0,
  pendingBookings: 0,
  pendingServiceBookings: 0,
  pendingDeliveries: 0,
});

  const cards = isCustomer
    ? [
        { title: "My Bookings", value: stats.bookings },
        { title: "My Services", value: stats.serviceBookings },
        { title: "My Deliveries", value: stats.deliveries },
        { title: "My Payments", value: stats.payments },
        { title: "Pending Items", value: stats.pendingBookings + stats.pendingServiceBookings + stats.pendingDeliveries },
      ]
    : isMechanic
      ? [
          { title: "Assigned Repairs", value: stats.serviceBookings },
          { title: "Completed Repairs", value: stats.completedServiceBookings || 0 },
          { title: "Pending Repairs", value: stats.pendingServiceBookings },
          { title: "Deliveries", value: stats.deliveries },
        ]
      : isDeliveryMan
        ? [
            { title: "Assigned Deliveries", value: stats.deliveries },
            { title: "Completed Deliveries", value: stats.completedDeliveries || 0 },
            { title: "Pending Deliveries", value: stats.pendingDeliveries },
          ]
    : [
        { title: "Vehicles", value: stats.vehicles },
        { title: "Bookings", value: stats.bookings },
        { title: "Deliveries", value: stats.deliveries },
        { title: "Revenue", value: stats.totalRevenue },
      ];

  const quickActions = [
    { label: "Add Vehicle", href: "/add-vehicle" },
    { label: "Add Booking", href: "/add-booking" },
    { label: "Open Reports", href: "/reports" },
  ];

  const adminQuickActions = [...quickActions, { label: "Add Employee", href: "/add-employee" }];

  const customerQuickActions = [
    { label: "Vehicle Inventory", href: "/vehicles" },
    { label: "My Bookings", href: "/bookings" },
    { label: "Feedback", href: "/feedback" },
  ];

  const fetchStats = async () => {
  try {
    const defaultList = [];

    const toList = (result) => {
      if (result.status === "fulfilled") {
        return Array.isArray(result.value?.data) ? result.value.data : defaultList;
      }
      return defaultList;
    };

    const [vehiclesResult, customersResult, bookingsResult, serviceBookingsResult, deliveriesResult, paymentsResult, employeesResult] =
      await Promise.allSettled([
        api.get("/vehicles"),
        api.get("/customers"),
        api.get("/bookings", { params: isCustomer && user?.email ? { customerEmail: user.email } : {} }),
        api.get("/services/bookings", { params: isCustomer && user?.email ? { customerEmail: user.email } : {} }),
        api.get("/deliveries", { params: isCustomer && user?.email ? { customerEmail: user.email } : {} }),
        api.get("/payments", { params: isCustomer && user?.email ? { customerEmail: user.email } : {} }),
        api.get("/employees"),
      ]);

    const vehicles = toList(vehiclesResult);
    const customers = toList(customersResult);
    const bookings = toList(bookingsResult);
    const serviceBookings = toList(serviceBookingsResult);
    const deliveries = toList(deliveriesResult);
    const payments = toList(paymentsResult);
    const employees = toList(employeesResult);

    const totalRevenue = payments.reduce((sum, payment) => {
      if (isCompletedPayment(payment)) {
        return sum + Number(payment.amount || 0);
      }
      return sum;
    }, 0);

    const pendingBookings = bookings.filter((booking) => booking.status === "Pending").length;
    const pendingServiceBookings = serviceBookings.filter(
      (booking) => booking.status === "Pending" || booking.status === "Confirmed"
    ).length;
    const completedServiceBookings = serviceBookings.filter(
      (booking) => booking.status === "Completed"
    ).length;
    const completedDeliveries = deliveries.filter((delivery) => delivery.status === "Delivered").length;

    const pendingDeliveries = deliveries.filter(
      (delivery) => delivery.status !== "Delivered"
    ).length;

    setStats({
      vehicles: vehicles.length,
      customers: customers.length,
      bookings: bookings.length,
      serviceBookings: serviceBookings.length,
      deliveries: deliveries.length,
      payments: payments.length,
      employees: employees.length,
      totalRevenue,
      pendingBookings,
      pendingServiceBookings,
      completedServiceBookings,
      completedDeliveries,
      pendingDeliveries,
    });
  } catch (error) {
    console.log(error);
  }
};

useEffect(() => {
  fetchStats();
}, []);

useEffect(() => {
  const refreshStats = () => {
    fetchStats();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      refreshStats();
    }
  };

  window.addEventListener("focus", refreshStats);
  window.addEventListener("autohub:payments-updated", refreshStats);
  window.addEventListener("storage", refreshStats);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", refreshStats);
    window.removeEventListener("autohub:payments-updated", refreshStats);
    window.removeEventListener("storage", refreshStats);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, []);

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <section className="dashboard-hero card">
            <div className="dashboard-hero-copy">
              <span className="eyebrow">Executive Overview</span>
              <h1>Welcome back, {user?.name || "Manager"}.</h1>
              <p>
                {isCustomer
                  ? "Here is your personal booking, delivery, and payment snapshot."
                  : "Here is the current showroom snapshot across inventory, bookings, deliveries, payments, and staff."}
              </p>
            </div>

            <div className="dashboard-meta">
              <div>
                <span>Role</span>
                <strong>{user?.role || "User"}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user?.email || "-"}</strong>
              </div>
            </div>
          </section>

          <div className="dashboard-actions">
            {(isCustomer ? customerQuickActions : isAdmin ? adminQuickActions : quickActions).map((action) => (
              <Link key={action.label} to={action.href} className="dashboard-action card">
                <strong>{action.label}</strong>
                <span>{action.href === "/reports" ? "View analytics" : "Open form"}</span>
              </Link>
            ))}
          </div>

          <div className="grid-container dashboard-grid">
            {cards.map((card, index) => (
              <div key={index} className="card stat-card">
                <h3>{card.title}</h3>
                <p>{card.value}</p>
              </div>
            ))}
          </div>

          {showRevenue ? (
            <section className="dashboard-insights">
              <div className="card insight-card">
                <span className="eyebrow">Operations</span>
                <h3>{isCustomer ? "Your active items" : "Pending work"}</h3>
                <div className="insight-list">
                  <div>
                    <strong>{stats.pendingBookings}</strong>
                    <span>{isCustomer ? "Bookings awaiting action" : "Bookings awaiting action"}</span>
                  </div>
                  <div>
                    <strong>{stats.pendingDeliveries}</strong>
                    <span>{isCustomer ? "Deliveries not completed" : "Deliveries not completed"}</span>
                  </div>
                </div>
              </div>

              <div className="card insight-card accent-card">
                <span className="eyebrow">Revenue</span>
                <h3>{isCustomer ? "Your completed payments" : "Total completed revenue"}</h3>
                <p className="revenue-value">{stats.totalRevenue}</p>
                <span className="muted-copy">Completed payment records only.</span>
              </div>
            </section>
          ) : (
            <div className="card insight-card dashboard-operations">
              <span className="eyebrow">Operations</span>
              <h3>{isMechanic ? "Assigned repairs" : isDeliveryMan ? "Assigned deliveries" : "Pending work"}</h3>
              <div className="insight-list">
                <div>
                  <strong>{isMechanic ? stats.pendingServiceBookings : stats.pendingBookings}</strong>
                  <span>{isMechanic ? "Repairs awaiting action" : "Bookings awaiting action"}</span>
                </div>
                <div>
                  <strong>{stats.pendingDeliveries}</strong>
                  <span>{isDeliveryMan ? "Deliveries not completed" : "Deliveries not completed"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Dashboard;
