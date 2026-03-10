import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";
import Services from "./pages/Services";
import Discounts from "./pages/Discounts";
import Appointments from "./pages/Appointments";
import BookingCalendar from "./pages/BookingCalendar";
import RecurringAppointments from "./pages/RecurringAppointments";
import Billing from "./pages/Billing";
import ServicePackages from "./pages/ServicePackages";
import { PrivateRoute, RoleRoute, PublicOnlyRoute } from "./components/routes/ProtectedRoutes";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - Auto redirect to dashboard if logged in */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Private Dashboard Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            
            {/* Accessible to Admin Only */}
            <Route element={<RoleRoute allowedRoles={['Admin']} />}>
              <Route index element={<DashboardHome />} />
              <Route path="staff" element={<Staff />} />
              <Route path="services" element={<Services />} />
              <Route path="service-packages" element={<ServicePackages />} />
              <Route path="discounts" element={<Discounts />} />
            </Route>

            {/* Accessible to Admin, Receptionist, and Staff */}
            <Route element={<RoleRoute allowedRoles={['Admin', 'Receptionist', 'Staff']} />}>
              <Route path="calendar" element={<BookingCalendar />} />
              <Route path="customers" element={<Customers />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="recurring" element={<RecurringAppointments />} />
              <Route path="billing" element={<Billing />} />
            </Route>

          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
