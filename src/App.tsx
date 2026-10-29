import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { AuthPage } from './pages/AuthPage';
import { DiscoveryDashboard } from './pages/DiscoveryDashboard';
import { ResourceDetailPage } from './pages/ResourceDetailPage';
import { BookingRequestPage } from './pages/BookingRequestPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { CheckInOutPage } from './pages/CheckInOutPage';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { OwnerApprovalQueue } from './pages/OwnerApprovalQueue';
import { IncidentManagementPage } from './pages/IncidentManagementPage';
import { InstitutionManagerDashboard } from './pages/InstitutionManagerDashboard';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { AdminUserDirectoryPage } from './pages/AdminUserDirectoryPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DiscoveryDashboard />} />
            <Route path="/resources/:id" element={<ResourceDetailPage />} />
            <Route path="/resources/:id/book" element={<BookingRequestPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/checkin" element={<CheckInOutPage />} />
            <Route path="/reports" element={<IncidentManagementPage />} />

            {/* Owner Routes */}
            <Route
              path="/owner"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/approvals"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin']}>
                  <OwnerApprovalQueue />
                </ProtectedRoute>
              }
            />

            {/* Manager / Oversight Routes */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['manager', 'admin']}>
                  <InstitutionManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute allowedRoles={['manager', 'admin']}>
                  <AuditHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Administrator Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUserDirectoryPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
