import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import SchoolLayout from './layouts/SchoolLayout';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEquipmentPage from './pages/admin/AdminEquipmentPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminBookingDetailPage from './pages/admin/AdminBookingDetailPage';
import AdminReturnsPage from './pages/admin/AdminReturnsPage';
import AdminMaintenancePage from './pages/admin/AdminMaintenancePage';
import AdminSchoolsPage from './pages/admin/AdminSchoolsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminTransportZonesPage from './pages/admin/AdminTransportZonesPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

// School pages
import SchoolHomePage from './pages/school/SchoolHomePage';
import SchoolCatalogPage from './pages/school/SchoolCatalogPage';
import SchoolEquipmentDetailPage from './pages/school/SchoolEquipmentDetailPage';
import SchoolBookingsPage from './pages/school/SchoolBookingsPage';
import SchoolBookingDetailPage from './pages/school/SchoolBookingDetailPage';
import SchoolCartPage from './pages/school/SchoolCartPage';
import SchoolPaymentsPage from './pages/school/SchoolPaymentsPage';
import SchoolProfilePage from './pages/school/SchoolProfilePage';
import SchoolHelpPage from './pages/school/SchoolHelpPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth routes ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* ── Admin portal (ADMIN role required) ── */}
        <Route element={<ProtectedRoute role="ADMIN" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/equipment" element={<AdminEquipmentPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/bookings/:id" element={<AdminBookingDetailPage />} />
            <Route path="/admin/returns" element={<AdminReturnsPage />} />
            <Route path="/admin/maintenance" element={<AdminMaintenancePage />} />
            <Route path="/admin/schools" element={<AdminSchoolsPage />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="/admin/transport-zones" element={<AdminTransportZonesPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>
        </Route>

        {/* ── School portal (SCHOOL role required) ── */}
        <Route element={<ProtectedRoute role="SCHOOL" />}>
          <Route element={<SchoolLayout />}>
            <Route path="/school" element={<SchoolHomePage />} />
            <Route path="/school/catalog" element={<SchoolCatalogPage />} />
            <Route path="/school/equipment/:id" element={<SchoolEquipmentDetailPage />} />
            <Route path="/school/bookings" element={<SchoolBookingsPage />} />
            <Route path="/school/bookings/:id" element={<SchoolBookingDetailPage />} />
            <Route path="/school/cart" element={<SchoolCartPage />} />
            <Route path="/school/payments" element={<SchoolPaymentsPage />} />
            <Route path="/school/profile" element={<SchoolProfilePage />} />
            <Route path="/school/help" element={<SchoolHelpPage />} />
          </Route>
        </Route>

        {/* ── Root redirect ── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}



