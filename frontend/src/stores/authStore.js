import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // Customer State
  customer: JSON.parse(sessionStorage.getItem('customerProfile') || 'null'),
  customerToken: sessionStorage.getItem('customerAccessToken') || null,
  viewMode: sessionStorage.getItem('customerViewMode') || 'buyer',
  
  // Admin State
  admin: JSON.parse(sessionStorage.getItem('adminProfile') || 'null'),
  adminToken: sessionStorage.getItem('adminAccessToken') || null,
  
  // Setters
  setCustomerAuth: (customer, token) => {
    // Clear admin credentials to prevent conflicts
    sessionStorage.removeItem('adminAccessToken');
    sessionStorage.removeItem('adminProfile');
    
    sessionStorage.setItem('customerAccessToken', token);
    sessionStorage.setItem('customerProfile', JSON.stringify(customer));
    let initialViewMode = 'buyer';
    if (customer && customer.customer_type === 'lender') {
      initialViewMode = 'lender';
    } else if (customer && customer.customer_type === 'both') {
      initialViewMode = sessionStorage.getItem('customerViewMode') || 'buyer';
    }
    sessionStorage.setItem('customerViewMode', initialViewMode);
    set({ customer, customerToken: token, viewMode: initialViewMode, admin: null, adminToken: null });
  },
  
  clearCustomerAuth: () => {
    sessionStorage.removeItem('customerAccessToken');
    sessionStorage.removeItem('customerProfile');
    sessionStorage.removeItem('customerViewMode');
    set({ customer: null, customerToken: null, viewMode: 'buyer' });
  },
  
  setViewMode: (mode) => {
    sessionStorage.setItem('customerViewMode', mode);
    set({ viewMode: mode });
  },

  
  setAdminAuth: (admin, token) => {
    // Clear customer credentials to prevent conflicts
    sessionStorage.removeItem('customerAccessToken');
    sessionStorage.removeItem('customerProfile');
    sessionStorage.removeItem('customerViewMode');

    sessionStorage.setItem('adminAccessToken', token);
    sessionStorage.setItem('adminProfile', JSON.stringify(admin));
    set({ admin, adminToken: token, customer: null, customerToken: null });
  },
  
  clearAdminAuth: () => {
    sessionStorage.removeItem('adminAccessToken');
    sessionStorage.removeItem('adminProfile');
    set({ admin: null, adminToken: null });
  },
  
  isAuthenticated: () => !!sessionStorage.getItem('customerAccessToken'),
  isAdminAuthenticated: () => !!sessionStorage.getItem('adminAccessToken'),
}));
