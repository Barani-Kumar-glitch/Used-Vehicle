import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import BuyerLayout from './apps/buyer/BuyerLayout.jsx';
import AdminLayout from './apps/admin/AdminLayout.jsx';

// Auth Pages
import Login from './apps/auth/Login.jsx';
import Register from './apps/auth/Register.jsx';
import VerifyOtp from './apps/auth/VerifyOtp.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import ReferralTracker from './components/ReferralTracker.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
// Buyer Pages
import VehicleList from './apps/buyer/VehicleList.jsx';
import VehicleDetail from './apps/buyer/VehicleDetail.jsx';
import MyReferrals from './apps/buyer/MyReferrals.jsx';

// Lending Pages
import RentalList from './apps/lending/RentalList.jsx';
import DriverList from './apps/lending/DriverList.jsx';

// Admin Pages
import Dashboard from './apps/admin/Dashboard.jsx';
import SoldVehicles from './apps/admin/SoldVehicles.jsx';
import Rentals from './apps/admin/Rentals.jsx';
import Bookings from './apps/admin/Bookings.jsx';
import Drivers from './apps/admin/Drivers.jsx';
import Customers from './apps/admin/Customers.jsx';
import Referrals from './apps/admin/Referrals.jsx';
import Payments from './apps/admin/Payments.jsx';
import VehicleRegistry from './apps/admin/VehicleRegistry.jsx';

export const App = () => {
  return (
    <BrowserRouter>
      <ReferralTracker />
      <ToastContainer />
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* Customer Panel routes - protected */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<BuyerLayout />}>
            <Route index element={<Navigate to="/buy" replace />} />
            <Route path="buy" element={<VehicleList />} />
            <Route path="buy/vehicle/:id" element={<VehicleDetail />} />
            <Route path="rent" element={<RentalList />} />
            <Route path="drivers" element={<DriverList />} />
            <Route path="my-referrals" element={<MyReferrals />} />
          </Route>
        </Route>

        {/* Admin Panel routes - admin only */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/status-log" replace />} />
            <Route path="status-log" element={<Dashboard />} />
            <Route path="sold-vehicles" element={<SoldVehicles />} />
            <Route path="vehicle-registry" element={<VehicleRegistry />} />
            <Route path="rentals" element={<Rentals />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="payments" element={<Payments />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/buy" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
