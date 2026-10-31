import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Foundation Pages (Person 3)
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { PlansPage } from './pages/plans/PlansPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerPortalOverview } from './pages/portal/CustomerPortalOverview';

// Person 4 Route Registry
import { billingRoutes } from './billingRoutes';

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'customer') {
    return <Navigate to="/portal" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Application Chassis */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Default landing redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Person 3 Foundation Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />

              {/* Customer Portal Base */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}>
                    <CustomerPortalOverview />
                  </ProtectedRoute>
                }
              />

              {/* Person 4 Billing Routes (spread dynamically) */}
              {Array.isArray(billingRoutes) &&
                billingRoutes.map((route, index) => (
                  <Route
                    key={route.path || index}
                    path={route.path}
                    element={
                      route.roles ? (
                        <ProtectedRoute allowedRoles={route.roles}>
                          {route.element}
                        </ProtectedRoute>
                      ) : (
                        route.element
                      )
                    }
                  />
                ))}

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
