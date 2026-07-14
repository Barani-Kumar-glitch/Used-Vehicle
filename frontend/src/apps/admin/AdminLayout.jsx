import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { 
  ShieldAlert, 
  Car, 
  Database,
  Calendar, 
  CalendarCheck,
  Users, 
  UserCheck, 
  IndianRupee, 
  Share2, 
  LogOut, 
  ArrowLeft,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const AdminLayout = () => {
  const { admin, clearAdminAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedCategory, setExpandedCategory] = useState(null);
  const { banner, clearBanner } = useNotificationStore();

  const handleLogout = () => {
    clearAdminAuth();
    navigate('/login');
  };

  const statusLogItem = { label: 'Status Log', path: '/admin/status-log', icon: ShieldAlert };

  const categories = [
    {
      id: 'acquired',
      label: 'Acquired Vehicle',
      icon: Car,
      items: [
        { label: 'Sold vehicle', path: '/admin/sold-vehicles', icon: Car },
      ]
    },
    {
      id: 'registry',
      label: 'Registry',
      icon: Database,
      items: [
        { label: 'Vehicle Registry', path: '/admin/vehicle-registry', icon: Database },
        { label: 'Driver Registry', path: '/admin/drivers', icon: UserCheck },
        { label: 'Customer Registry', path: '/admin/customers', icon: Users },
      ]
    },
    {
      id: 'rental_booking',
      label: 'Rental and Booking',
      icon: Calendar,
      items: [
        { label: 'Vehicle Rental', path: '/admin/rentals', icon: Calendar },
        { label: 'Driver Booking', path: '/admin/bookings', icon: CalendarCheck },
      ]
    },
    {
      id: 'referral',
      label: 'Referral',
      icon: Share2,
      items: [
        { label: 'Referral & Commission', path: '/admin/referrals', icon: Share2 },
      ]
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: IndianRupee,
      items: [
        { label: 'Payment Table', path: '/admin/payments', icon: IndianRupee },
      ]
    }
  ];

  const toggleCategory = (catId) => {
    setExpandedCategory(prev => prev === catId ? null : catId);
  };

  useEffect(() => {
    const activeCat = categories.find(cat => 
      cat.items.some(item => location.pathname === item.path)
    );
    if (activeCat) {
      setExpandedCategory(activeCat.id);
    }
  }, [location.pathname]);

  useEffect(() => {
    clearBanner();
  }, [location.pathname]);

  const [hasNewEvents, setHasNewEvents] = useState(false);

  const checkNewStatusEvents = async () => {
    try {
      const res = await API.get('/admin/status-events', { params: { limit: 1 } });
      const latestEvent = res.data.events && res.data.events[0];
      if (latestEvent) {
        const lastViewedId = localStorage.getItem('lastViewedStatusLogId');
        if (lastViewedId) {
          if (parseInt(latestEvent.event_log_id, 10) > parseInt(lastViewedId, 10)) {
            setHasNewEvents(true);
          } else {
            setHasNewEvents(false);
          }
        } else {
          setHasNewEvents(true);
        }
      }
    } catch (err) {
      console.error('Failed to check new status events:', err);
    }
  };

  useEffect(() => {
    if (location.pathname === '/admin/status-log') {
      setHasNewEvents(false);
      const updateLastViewed = async () => {
        try {
          const res = await API.get('/admin/status-events', { params: { limit: 1 } });
          const latestEvent = res.data.events && res.data.events[0];
          if (latestEvent) {
            localStorage.setItem('lastViewedStatusLogId', latestEvent.event_log_id.toString());
          }
        } catch (err) {
          console.error(err);
        }
      };
      updateLastViewed();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/admin/status-log') {
      checkNewStatusEvents();
    }

    const interval = setInterval(() => {
      if (location.pathname !== '/admin/status-log') {
        checkNewStatusEvents();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  const isStatusActive = location.pathname === statusLogItem.path;

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex overflow-hidden">
      <aside className="w-64 bg-slate-955 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden">
        <div className="p-4 border-b border-slate-800 shrink-0">
          <Link to="/admin/status-log" className="flex items-center space-x-2 text-white font-extrabold text-lg">
            <span className="bg-brand-600 p-1.5 rounded-lg text-sm text-white">ADM</span>
            <span>Admin Panel</span>
          </Link>
          {admin && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400 capitalize">{admin.username} ({admin.role})</span>
            </div>
          )}
        </div>

        <nav className="flex-grow p-3 space-y-1 overflow-y-auto no-scrollbar">
          {/* Status Log standalone item */}
          <Link
            to={statusLogItem.path}
            className={`flex items-center space-x-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all ${
              isStatusActive 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
            }`}
          >
            <div className="relative flex items-center">
              <statusLogItem.icon size={18} />
              {hasNewEvents && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-slate-950" />
              )}
            </div>
            <span>{statusLogItem.label}</span>
          </Link>

          <div className="pt-2 border-t border-slate-800/60 space-y-1">
            {categories.map((cat) => {
              const isExpanded = expandedCategory === cat.id;
              const CatIcon = cat.icon;
              const hasActiveSubitem = cat.items.some(item => location.pathname === item.path);

              return (
                <div key={cat.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all focus:outline-none ${
                      hasActiveSubitem
                        ? 'text-brand-400 bg-slate-900/50'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CatIcon size={18} />
                      <span>{cat.label}</span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {/* Sub-items */}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l border-slate-800/80 ml-5 my-1">
                      {cat.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = location.pathname === item.path;

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              isItemActive 
                                ? 'bg-slate-800 text-brand-400 font-bold shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                            }`}
                          >
                            <ItemIcon size={14} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1 shrink-0 bg-slate-950">
          <Link 
            to="/rent" 
            className="flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Go to Rental Panel</span>
          </Link>

          <Link 
            to="/buy" 
            className="flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Go to Buyer Panel</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-100 hover:bg-rose-955/30 transition-colors focus:outline-none"
          >
            <LogOut size={16} />
            <span>Logout Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-full">
        <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-3">
            <LayoutDashboard size={20} className="text-brand-500" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              {(() => {
                if (location.pathname === statusLogItem.path) return statusLogItem.label;
                const foundItem = categories.flatMap(c => c.items).find(item => location.pathname === item.path);
                return foundItem ? foundItem.label : 'Admin Control Panel';
              })()}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-brand-400 uppercase tracking-wider border border-slate-700">
              Live Monitoring
            </span>
          </div>
        </header>
        
        {banner && (
          <div className={`px-8 py-3.5 flex items-center justify-between transition-all duration-300 shrink-0 ${
            banner.type === 'success' 
              ? 'bg-emerald-950/60 border-b border-emerald-800/40 text-emerald-300' 
              : banner.type === 'warning'
              ? 'bg-amber-950/60 border-b border-amber-800/40 text-amber-300'
              : 'bg-rose-955/60 border-b border-rose-900/40 text-rose-350'
          }`}>
            <div className="flex items-center space-x-2.5 text-sm font-semibold">
              {banner.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : banner.type === 'warning' ? (
                <AlertCircle size={16} className="text-amber-400" />
              ) : (
                <ShieldAlert size={16} className="text-rose-400" />
              )}
              <span>{banner.message}</span>
            </div>
            <button 
              onClick={clearBanner} 
              className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider px-2 py-1 rounded hover:bg-slate-800/50 focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="flex-grow p-8 overflow-y-auto no-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
