import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#cbd0d2] flex items-center justify-center p-4">
        <Spinner size="lg" label="RESTORING SECURITY SESSION..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If customer trying to access admin pages, redirect to /portal
    if (user.role === 'customer') {
      return <Navigate to="/portal" replace />;
    }
    // If staff/admin trying to access customer only pages, redirect to /dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

