import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Code-split pages for optimized bundle size & fast initial paint
const AuthPage = React.lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const DiscoveryDashboard = React.lazy(() => import('./pages/DiscoveryDashboard').then((m) => ({ default: m.DiscoveryDashboard })));
const ResourceDetailPage = React.lazy(() => import('./pages/ResourceDetailPage').then((m) => ({ default: m.ResourceDetailPage })));
const BookingRequestPage = React.lazy(() => import('./pages/BookingRequestPage').then((m) => ({ default: m.BookingRequestPage })));
const MyBookingsPage = React.lazy(() => import('./pages/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })));
const CheckInOutPage = React.lazy(() => import('./pages/CheckInOutPage').then((m) => ({ default: m.CheckInOutPage })));
const OwnerDashboard = React.lazy(() => import('./pages/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })));
const OwnerApprovalQueue = React.lazy(() => import('./pages/OwnerApprovalQueue').then((m) => ({ default: m.OwnerApprovalQueue })));
const IncidentManagementPage = React.lazy(() => import('./pages/IncidentManagementPage').then((m) => ({ default: m.IncidentManagementPage })));
const InstitutionManagerDashboard = React.lazy(() => import('./pages/InstitutionManagerDashboard').then((m) => ({ default: m.InstitutionManagerDashboard })));
const AuditHistoryPage = React.lazy(() => import('./pages/AuditHistoryPage').then((m) => ({ default: m.AuditHistoryPage })));
const AdminUserDirectoryPage = React.lazy(() => import('./pages/AdminUserDirectoryPage').then((m) => ({ default: m.AdminUserDirectoryPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[#183D30] border-t-[#D8FF3E] animate-spin" />
      <span className="font-mono text-xs text-[#7E8276] uppercase tracking-wider">
        Loading module...
      </span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
