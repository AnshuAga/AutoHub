import { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { api } from "../../utils/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CHART_COLORS = ["#0f4c81", "#0f766e", "#1d4ed8", "#f59e0b", "#dc2626", "#8b5cf6"];

function Reports() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role || "customer";
  const isCustomer = role === "customer";

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [rawData, setRawData] = useState({
    vehicles: [],
    customers: [],
    bookings: [],
    deliveries: [],
    payments: [],
    employees: [],
  });

  const [stats, setStats] = useState({
    vehicles: 0,
    customers: 0,
    bookings: 0,
    deliveries: 0,
    payments: 0,
    employees: 0,
    totalRevenue: 0,
    completedPayments: 0,
    deliveredVehicles: 0,
  });
  const [selectedBranch, setSelectedBranch] = useState("all");

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [
        vehiclesRes,
        customersRes,
        bookingsRes,
        deliveriesRes,
        paymentsRes,
        employeesRes,
      ] = await Promise.all([
        api.get("/vehicles"),
        api.get("/customers"),
        api.get("/bookings", {
          params: isCustomer && user?.email ? { customerEmail: user.email } : {},
        }),
        api.get("/deliveries", {
          params: isCustomer && user?.email ? { customerEmail: user.email } : {},
        }),
        api.get("/payments", {
          params: isCustomer && user?.email ? { customerEmail: user.email } : {},
        }),
        api.get("/employees"),
      ]);

      setRawData({
        vehicles: vehiclesRes.data,
        customers: customersRes.data,
        bookings: bookingsRes.data,
        deliveries: deliveriesRes.data,
        payments: paymentsRes.data,
        employees: employeesRes.data,
      });

      const completedPayments = paymentsRes.data.filter(
        (payment) => payment.status === "Completed"
      );

      const totalRevenue = completedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

      const deliveredVehicles = deliveriesRes.data.filter(
        (delivery) => delivery.status === "Delivered"
      ).length;

      setStats({
        vehicles: vehiclesRes.data.length,
        customers: customersRes.data.length,
        bookings: bookingsRes.data.length,
        deliveries: deliveriesRes.data.length,
        payments: paymentsRes.data.length,
        employees: employeesRes.data.length,
        totalRevenue,
        completedPayments: completedPayments.length,
        deliveredVehicles,
      });
    } catch (error) {
      console.log(error);
      setErrorMessage(error.response?.data?.message || "Failed to load reports data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getBranchName = (item) => {
    const branch = item?.branch;
    return typeof branch === "string" && branch.trim() ? branch.trim() : "Unassigned";
  };

  const dynamicBranches = Array.from(
    new Set(
      [
        ...rawData.vehicles,
        ...rawData.customers,
        ...rawData.bookings,
        ...rawData.deliveries,
        ...rawData.payments,
        ...rawData.employees,
      ].map(getBranchName)
    )
  )
    .filter(
      (branchName) =>
        branchName.toLowerCase() !== "all" &&
        branchName.toLowerCase() !== "delhi" &&
        branchName.toLowerCase() !== "mumbai"
    )
    .sort((a, b) => a.localeCompare(b));

  const filterByBranch = (items) => {
    if (selectedBranch === "all") {
      return items;
    }
    return items.filter((item) => getBranchName(item) === selectedBranch);
  };

  const filteredData = {
    vehicles: filterByBranch(rawData.vehicles),
    customers: filterByBranch(rawData.customers),
    bookings: filterByBranch(rawData.bookings),
    deliveries: filterByBranch(rawData.deliveries),
    payments: filterByBranch(rawData.payments),
    employees: filterByBranch(rawData.employees),
  };

  const filteredCompletedPayments = filteredData.payments.filter(
    (payment) => payment.status === "Completed"
  );

  const filteredStats = {
    vehicles: filteredData.vehicles.length,
    customers: filteredData.customers.length,
    bookings: filteredData.bookings.length,
    deliveries: filteredData.deliveries.length,
    payments: filteredData.payments.length,
    employees: filteredData.employees.length,
    totalRevenue: filteredCompletedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    ),
    completedPayments: filteredCompletedPayments.length,
    deliveredVehicles: filteredData.deliveries.filter(
      (delivery) => delivery.status === "Delivered"
    ).length,
  };

  const bookingStatusData = Object.entries(
    filteredData.bookings.reduce((acc, booking) => {
      const key = booking.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const getBookingStatusCount = (statusName) =>
    filteredData.bookings.filter(
      (booking) => String(booking.status || "").toLowerCase() === statusName.toLowerCase()
    ).length;

  const pendingBookingsCount = getBookingStatusCount("Pending");
  const confirmedBookingsCount = getBookingStatusCount("Confirmed");
  const inServiceBookingsCount = getBookingStatusCount("In Service");
  const completedBookingsCount = getBookingStatusCount("Completed");
  const cancelledBookingsCount = getBookingStatusCount("Cancelled");

  const totalPipelineBookings = filteredData.bookings.length;
  const confirmationRate = totalPipelineBookings
    ? Math.round((confirmedBookingsCount / totalPipelineBookings) * 100)
    : 0;
  const completionFromConfirmedRate = confirmedBookingsCount
    ? Math.round((completedBookingsCount / confirmedBookingsCount) * 100)
    : 0;
  const pipelineConversionRate = totalPipelineBookings
    ? Math.round((completedBookingsCount / totalPipelineBookings) * 100)
    : 0;

  const bottleneckCandidates = [
    { stage: "Pending", count: pendingBookingsCount },
    { stage: "Confirmed", count: confirmedBookingsCount },
    { stage: "In Service", count: inServiceBookingsCount },
  ];
  const pipelineBottleneck = bottleneckCandidates.reduce(
    (previous, current) => (current.count > previous.count ? current : previous),
    bottleneckCandidates[0]
  );

  const paymentStatusData = Object.entries(
    filteredData.payments.reduce((acc, payment) => {
      const key = payment.status || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const operationsMixData = [
    { name: "Vehicles", value: filteredStats.vehicles },
    { name: "Customers", value: filteredStats.customers },
    { name: "Bookings", value: filteredStats.bookings },
    { name: "Deliveries", value: filteredStats.deliveries },
    { name: "Payments", value: filteredStats.payments },
    { name: "Employees", value: filteredStats.employees },
  ];

  const completionRate = filteredStats.payments
    ? Math.round((filteredStats.completedPayments / filteredStats.payments) * 100)
    : 0;

  const deliveryRate = filteredStats.deliveries
    ? Math.round((filteredStats.deliveredVehicles / filteredStats.deliveries) * 100)
    : 0;

  const downloadBlobFile = (fileName, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Generated At", new Date().toLocaleString()],
      ["Report Scope", isCustomer ? "Customer Personal" : "Organization"],
      ["Branch", selectedBranch === "all" ? "All Branches" : selectedBranch],
      ["Vehicles", filteredStats.vehicles],
      ["Customers", filteredStats.customers],
      ["Bookings", filteredStats.bookings],
      ["Deliveries", filteredStats.deliveries],
      ["Payments", filteredStats.payments],
      ["Employees", filteredStats.employees],
      ["Completed Payments", filteredStats.completedPayments],
      ["Delivered Vehicles", filteredStats.deliveredVehicles],
      ["Total Revenue", filteredStats.totalRevenue],
      ["Payment Completion Rate", `${completionRate}%`],
      ["Delivery Completion Rate", `${deliveryRate}%`],
      ["Booking Confirmation Rate", `${confirmationRate}%`],
      ["Booking Completion (from Confirmed)", `${completionFromConfirmedRate}%`],
      ["Booking Pipeline Conversion", `${pipelineConversionRate}%`],
      ["Booking Pipeline Bottleneck", `${pipelineBottleneck.stage} (${pipelineBottleneck.count})`],
    ];

    const bookingRows = bookingStatusData.map((entry) => [
      `Booking Status: ${entry.name}`,
      entry.value,
    ]);

    const paymentRows = paymentStatusData.map((entry) => [
      `Payment Status: ${entry.name}`,
      entry.value,
    ]);

    const csvContent = [...rows, ...bookingRows, ...paymentRows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    downloadBlobFile(`autohub-report-${Date.now()}.csv`, csvContent, "text/csv;charset=utf-8;");
  };

  const handleDownloadJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      scope: isCustomer ? "customer" : "organization",
      branch: selectedBranch,
      stats: filteredStats,
      bookingFunnel: {
        pending: pendingBookingsCount,
        confirmed: confirmedBookingsCount,
        inService: inServiceBookingsCount,
        completed: completedBookingsCount,
        cancelled: cancelledBookingsCount,
        confirmationRate,
        completionFromConfirmedRate,
        pipelineConversionRate,
        bottleneck: pipelineBottleneck,
      },
      bookingStatusData,
      paymentStatusData,
    };

    downloadBlobFile(
      `autohub-report-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8;"
    );
  };

  const handleDownloadPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    const generatedAt = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text("AutoHub Analytics Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${generatedAt}`, 14, 26);
    doc.text(`Scope: ${isCustomer ? "Customer Personal" : "Organization"}`, 14, 32);
    doc.text(`Branch: ${selectedBranch === "all" ? "All Branches" : selectedBranch}`, 14, 38);

    autoTable(doc, {
      startY: 46,
      head: [["KPI", "Value"]],
      body: [
        ["Vehicles", filteredStats.vehicles],
        ["Customers", filteredStats.customers],
        ["Bookings", filteredStats.bookings],
        ["Deliveries", filteredStats.deliveries],
        ["Payments", filteredStats.payments],
        ["Employees", filteredStats.employees],
        ["Total Revenue", `INR ${Number(filteredStats.totalRevenue || 0).toLocaleString("en-IN")}`],
        ["Completed Payments", filteredStats.completedPayments],
        ["Delivered Vehicles", filteredStats.deliveredVehicles],
        ["Payment Completion Rate", `${completionRate}%`],
        ["Delivery Completion Rate", `${deliveryRate}%`],
        ["Booking Confirmation Rate", `${confirmationRate}%`],
        ["Booking Completion (from Confirmed)", `${completionFromConfirmedRate}%`],
        ["Booking Pipeline Conversion", `${pipelineConversionRate}%`],
        ["Booking Pipeline Bottleneck", `${pipelineBottleneck.stage} (${pipelineBottleneck.count})`],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [15, 76, 129] },
      columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 85 } },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Booking Status", "Count"]],
      body: bookingStatusData.map((entry) => [entry.name, entry.value]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [15, 118, 110] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["Payment Status", "Count"]],
      body: paymentStatusData.map((entry) => [entry.name, entry.value]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [29, 78, 216] },
    });

    doc.save(`autohub-report-${Date.now()}.pdf`);
  };

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className="page-container">
          <Sidebar />
          <div className="content-container">
            <div className="card" style={{ marginTop: "20px" }}>
              <h2>Loading Reports...</h2>
              <p>Please wait while we generate your analytics snapshot.</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="page-container">
        <Sidebar />

        <div className="content-container">
          <section className="card reports-hero">
            <div>
              <span className="eyebrow">Insights Hub</span>
              <h1 style={{ marginTop: "10px" }}>{isCustomer ? "My Reports" : "Business Reports"}</h1>
              <p>
                Visual summary of operations, status distributions, and revenue performance.
              </p>
            </div>

            <div className="reports-download-actions">
              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
                aria-label="Filter reports by branch"
                className="reports-branch-filter"
              >
                <option value="all">All Branches</option>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
                {dynamicBranches.map((branchName) => (
                  <option key={branchName} value={branchName}>
                    {branchName}
                  </option>
                ))}
              </select>
              <button type="button" className="primary-btn" onClick={handleDownloadCsv}>
                Download CSV
              </button>
              <button type="button" className="ghost-btn" onClick={handleDownloadJson}>
                Download JSON
              </button>
              <button type="button" className="ghost-btn" onClick={handleDownloadPdf}>
                Download PDF
              </button>
            </div>
          </section>

          {errorMessage ? <div className="auth-status auth-status-error">{errorMessage}</div> : null}

          <div className="grid-container reports-kpi-grid" style={{ marginTop: "20px" }}>
            <div className="card stat-card">
              <h3>Total Revenue</h3>
              <p>{CURRENCY_FORMATTER.format(filteredStats.totalRevenue)}</p>
            </div>

            <div className="card stat-card">
              <h3>Completed Payments</h3>
              <p>{filteredStats.completedPayments}</p>
            </div>

            <div className="card stat-card">
              <h3>Delivered Vehicles</h3>
              <p>{filteredStats.deliveredVehicles}</p>
            </div>

            <div className="card stat-card">
              <h3>Payment Completion</h3>
              <p>{completionRate}%</p>
              <div className="reports-progress-track">
                <span style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            <div className="card stat-card">
              <h3>Delivery Completion</h3>
              <p>{deliveryRate}%</p>
              <div className="reports-progress-track">
                <span style={{ width: `${deliveryRate}%` }} />
              </div>
            </div>
          </div>

          <section className="reports-chart-grid">
            <div className="card reports-chart-card">
              <h3>Operations Mix</h3>
              <p>Overview of key entities in the system.</p>
              <div className="reports-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operationsMixData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {operationsMixData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card reports-chart-card">
              <h3>Payment Status Distribution</h3>
              <p>How payments are progressing across statuses.</p>
              <div className="reports-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={98}
                      paddingAngle={3}
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="card reports-chart-card" style={{ marginTop: "20px" }}>
            <h3>Booking Status Breakdown</h3>
            <p>Track booking pipeline and conversion bottlenecks.</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <div className="card" style={{ padding: "12px", borderRadius: "14px" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Confirmation Rate</span>
                <div style={{ fontSize: "22px", fontWeight: 800 }}>{confirmationRate}%</div>
              </div>
              <div className="card" style={{ padding: "12px", borderRadius: "14px" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Confirmed to Completed</span>
                <div style={{ fontSize: "22px", fontWeight: 800 }}>{completionFromConfirmedRate}%</div>
              </div>
              <div className="card" style={{ padding: "12px", borderRadius: "14px" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Pipeline Conversion</span>
                <div style={{ fontSize: "22px", fontWeight: 800 }}>{pipelineConversionRate}%</div>
              </div>
              <div className="card" style={{ padding: "12px", borderRadius: "14px" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>Current Bottleneck</span>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>
                  {pipelineBottleneck.stage} ({pipelineBottleneck.count})
                </div>
              </div>
            </div>
            <div className="reports-chart-box reports-chart-box-lg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Reports;