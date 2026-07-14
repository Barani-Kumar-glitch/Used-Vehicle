import axios from 'axios';

// Create basic API client
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(
  (config) => {
    const adminToken = sessionStorage.getItem('adminAccessToken');
    const customerToken = sessionStorage.getItem('customerAccessToken');
    
    // Determine if this is an administrative request
    const isAdminRequest = 
      config.url.includes('/admin') || 
      config.url.includes('/status-events') ||
      (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) ||
      (adminToken && !customerToken);

    if (isAdminRequest && adminToken) {
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    } else if (customerToken) {
      config.headers['Authorization'] = `Bearer ${customerToken}`;
    } else if (adminToken) {
      // Fallback: attach admin token if available so RequireAuth passes
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth failures (e.g. redirect to login)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('[API Client] Unauthorised or forbidden request detected. Clearing session.');
      
      // Clear token and profile storage
      sessionStorage.removeItem('customerAccessToken');
      sessionStorage.removeItem('customerProfile');
      sessionStorage.removeItem('customerViewMode');
      sessionStorage.removeItem('adminAccessToken');
      sessionStorage.removeItem('adminProfile');

      // Force redirect to login page if we are in a browser context and not already on an auth page
      if (typeof window !== 'undefined') {
        const isAuthPage = window.location.pathname === '/login' || 
                           window.location.pathname === '/signup' || 
                           window.location.pathname === '/verify-otp';
        if (!isAuthPage) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
