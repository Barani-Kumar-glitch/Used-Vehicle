import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useReferralStore } from '../../stores/referralStore.js';
import { Button, Badge } from '../../components/common/UI.jsx';
import { LogOut, User, Car, Calendar, Shield, Share2 } from 'lucide-react';

export const BuyerLayout = () => {
  const { customer, clearCustomerAuth, admin, clearAdminAuth, adminToken, viewMode, setViewMode } = useAuthStore();
  const { referralCode, clearReferralCode } = useReferralStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Create virtual user if admin is logged in but no customer profile exists
  const user = customer || (admin ? { name: admin.username, customer_type: 'both', is_admin: true } : null);

  const handleLogout = () => {
    if (admin) {
      clearAdminAuth();
    } else {
      clearCustomerAuth();
    }
    navigate('/login');
  };

  const currentPath = location.pathname;

  // Route protection and automatic viewMode sync
  React.useEffect(() => {
    if (!user) return;

    if (user.customer_type === 'buyer') {
      if (currentPath.startsWith('/rent') || currentPath.startsWith('/drivers')) {
        navigate('/buy', { replace: true });
      }
    } else if (user.customer_type === 'lender') {
      if (currentPath.startsWith('/buy')) {
        navigate('/rent', { replace: true });
      }
    } else if (user.customer_type === 'both') {
      if ((currentPath.startsWith('/rent') || currentPath.startsWith('/drivers')) && viewMode !== 'lender') {
        setViewMode('lender');
      } else if (currentPath.startsWith('/buy') && viewMode !== 'buyer') {
        setViewMode('buyer');
      }
    }
  }, [currentPath, user, viewMode, navigate, setViewMode]);

  const activeMode = user
    ? (user.customer_type === 'both' ? viewMode : user.customer_type)
    : 'buyer';

  const menuItems = activeMode === 'lender'
    ? [
      { label: 'Rent Vehicles', path: '/rent', icon: Calendar },
      { label: 'Hire Drivers', path: '/drivers', icon: User },
    ]
    : [
      { label: 'Buy Vehicles', path: '/buy', icon: Car },
    ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Referral Link Banner */}
      {referralCode && (
        <div className="bg-gradient-to-r from-accent-600 to-brand-700 text-white text-center py-2.5 px-4 text-sm flex items-center justify-center space-x-2 shadow-inner">
          <Share2 size={16} className="animate-pulse" />
          <span>Referral Link Activated! Sign up or request a vehicle to claim your referrer discount/reward.</span>
          <button
            onClick={clearReferralCode}
            className="underline ml-2 hover:text-slate-200 text-xs focus:outline-none"
          >
            Clear
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/buy" className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-1.5">
              <span className="bg-brand-600 text-white p-1.5 rounded-lg">BK</span>
              <span>PreOwned</span>
            </Link>

            <nav className="hidden md:flex space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {user.customer_type === 'both' && (
                  <button
                    onClick={() => {
                      const nextMode = viewMode === 'buyer' ? 'lender' : 'buyer';
                      setViewMode(nextMode);
                      navigate(nextMode === 'lender' ? '/rent' : '/buy');
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors shadow-sm"
                  >
                    <span>Switch to {viewMode === 'buyer' ? 'Lender' : 'Buyer'}</span>
                  </button>
                )}

                {!user.is_admin && (
                  <Link
                    to="/my-referrals"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${location.pathname === '/my-referrals'
                        ? 'bg-accent-50 border-accent-200 text-accent-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Share2 size={14} />
                    <span>My Referrals</span>
                  </Link>
                )}

                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                  <span className="text-xs text-slate-500 capitalize">{user.is_admin ? 'Administrator' : user.customer_type}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                  Sign Up
                </Button>
              </div>
            )}

            {adminToken && (
              <Link
                to="/admin/status-log"
                className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition-colors"
                title="Admin Portal"
              >
                <Shield size={18} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-sm">
          <div className="mb-4 md:mb-0">
            <span className="font-bold text-white">BK PreOwned Vehicles</span> © 2026. All rights reserved.
          </div>
          <div className="flex space-x-6">
            {activeMode === 'buyer' ? (
              <Link to="/buy" className="hover:text-white">Buy Cars</Link>
            ) : (
              <>
                <Link to="/rent" className="hover:text-white">Rent Cars</Link>
                <Link to="/drivers" className="hover:text-white">Hire Drivers</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
export default BuyerLayout;
