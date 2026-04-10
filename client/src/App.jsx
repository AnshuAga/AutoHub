import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/auth/login";
import EmployeeLogin from "./pages/auth/EmployeeLogin";
import Register from "./pages/auth/register";
import OAuthSuccess from "./pages/auth/OAuthSuccess";
import Dashboard from "./pages/dashboard/Dashboard";
import Vehicles from "./pages/vehicles/Vehicles";
import Customers from "./pages/customers/Customers";
import Bookings from "./pages/bookings/Bookings";
import Deliveries from "./pages/deliveries/Deliveries";
import Payments from "./pages/payments/Payments";
import AddVehicle from "./pages/vehicles/AddVehicle";
import EditVehicle from "./pages/vehicles/EditVehicle";
import AddCustomer from "./pages/customers/AddCustomer";
import EditCustomer from "./pages/customers/EditCustomer";
import AddBooking from "./pages/bookings/AddBooking";
import EditBooking from "./pages/bookings/EditBooking";
import AddDelivery from "./pages/deliveries/AddDelivery";
import EditDelivery from "./pages/deliveries/EditDelivery";
import AddPayment from "./pages/payments/AddPayment";
import EditPayment from "./pages/payments/EditPayment";
import Profile from "./pages/profile/Profile";
import Feedback from "./pages/feedback/Feedback";
import Settings from "./pages/settings/Settings";
import Employees from "./pages/employees/Employees";
import AddEmployee from "./pages/employees/AddEmployee";
import EditEmployee from "./pages/employees/EditEmployee";
import ServiceBookings from "./pages/services/ServiceBookings";
import AddServiceBooking from "./pages/services/AddServiceBooking";
import EditServiceBooking from "./pages/services/EditServiceBooking";
import ServiceCategories from "./pages/services/ServiceCategories";
import ProtectedRoute from "./components/ProtectedRoute";

const Reports = lazy(() => import("./pages/reports/Reports"));

const ReportsLoader = () => (
  <div className="card" style={{ marginTop: "20px" }}>
    <h2>Loading Reports...</h2>
    <p>Preparing visual analytics.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/team-login" element={<EmployeeLogin />} />
        <Route path="/employee-login" element={<EmployeeLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/success" element={<OAuthSuccess />} />
        <Route path="/oauth/success/*" element={<OAuthSuccess />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
           path="/vehicles"
          element={
             <ProtectedRoute>
                <Vehicles />
              </ProtectedRoute>
            }
         />
         <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute>
                <Deliveries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
              path="/add-vehicle"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AddVehicle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-vehicle/:id"
              element={
                <ProtectedRoute>
                  <EditVehicle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-customer"
              element={
                <ProtectedRoute>
                  <AddCustomer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-customer/:id"
              element={
                <ProtectedRoute>
                  <EditCustomer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-booking"
              element={
                <ProtectedRoute>
                  <AddBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-booking/:id"
              element={
                <ProtectedRoute>
                  <EditBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-delivery"
              element={
                <ProtectedRoute>
                  <AddDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-delivery/:id"
              element={
                <ProtectedRoute>
                  <EditDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-payment"
              element={
                <ProtectedRoute>
                  <AddPayment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-payment/:id"
              element={
                <ProtectedRoute>
                  <EditPayment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<ReportsLoader />}>
                    <Reports />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Employees />
                </ProtectedRoute>
              }
          />

          <Route
            path="/add-employee"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <AddEmployee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-employee/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <EditEmployee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-bookings"
            element={
              <ProtectedRoute>
                <ServiceBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-service-booking"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <AddServiceBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-service-booking/:id"
            element={
              <ProtectedRoute>
                <EditServiceBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-categories"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <ServiceCategories />
              </ProtectedRoute>
            }
          />
      </Routes>
    </BrowserRouter>
  );
}

export default App;