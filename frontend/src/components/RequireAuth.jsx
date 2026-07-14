// src/components/RequireAuth.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

const RequireAuth = () => {
  const isCustomer = useAuthStore(state => !!state.customerToken);
  const isAdmin = useAuthStore(state => !!state.adminToken);
  const location = useLocation();

  // Allow access if either a customer or an admin is authenticated
  if (isCustomer || isAdmin) {
    return <Outlet />;
  }
  // Not authenticated – redirect to login page
  const redirectUrl = location.pathname + location.search;
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
};

export default RequireAuth;
