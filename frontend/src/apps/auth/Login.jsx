import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button, Card } from '../../components/common/UI.jsx';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Mail, Lock, User, ShieldAlert } from 'lucide-react';

export const Login = () => {
  const { showToast } = useNotificationStore();
  const location = useLocation();
  const isAdminMode = location.pathname === '/admin/login';
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/buy';

  const setCustomerAuth = useAuthStore((state) => state.setCustomerAuth);
  const setAdminAuth = useAuthStore((state) => state.setAdminAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation checks
    if (isAdminMode) {
      if (!username || username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        showToast('Username must be at least 3 characters.', 'error');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        showToast('Please enter a valid email address.', 'error');
        return;
      }
    }

    setLoading(true);

    try {
      if (isAdminMode) {
        // Admin Login
        const res = await API.post('/auth/admin/login', { username, password });
        setAdminAuth(res.data.admin, res.data.accessToken);
        navigate('/admin/status-log');
      } else {
        // Customer OTP request
        await API.post('/auth/login', { email });
        showToast('OTP sent successfully to your email!', 'success');
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=login&redirect=${encodeURIComponent(redirectPath)}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login request failed. Check input details.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 bg-white border border-slate-100 shadow-xl rounded-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {isAdminMode ? 'Admin Portal' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isAdminMode ? 'Enter credentials to access administrative systems' : 'Enter email address to receive a verification OTP'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-100 flex items-center space-x-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {isAdminMode ? (
            // Admin inputs
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            // Customer input
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>
          )}

          <Button variant="primary" type="submit" disabled={loading} className="w-full py-3.5">
            {loading ? 'Processing...' : isAdminMode ? 'Sign In Admin' : 'Request verification code'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {isAdminMode ? (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-brand-600 font-semibold hover:underline"
            >
              Switch to Customer Login
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-brand-600 font-semibold hover:underline"
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="text-slate-400 hover:text-brand-600 hover:underline font-semibold"
              >
                Admin Portal
              </button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
export default Login;
