// src/components/RequireAdmin.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

const RequireAdmin = () => {
  const isAdmin = useAuthStore(state => !!state.adminToken);

  if (isAdmin) {
    return <Outlet />;
  }
  // Not an admin – redirect to login or maybe to public page
  return <Navigate to="/admin/login" replace />;
};

export default RequireAdmin;
