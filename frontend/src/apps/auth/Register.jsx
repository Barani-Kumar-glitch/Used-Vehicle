import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '../../components/common/UI.jsx';
import API from '../../api/index.js';
import { useReferralStore } from '../../stores/referralStore.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { User, Mail, Phone, MapPin, ShieldAlert, Share2 } from 'lucide-react';

export const Register = () => {
  const { showToast } = useNotificationStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState('buyer');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/buy';
  const referralCode = useReferralStore((state) => state.referralCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation checks
    if (!name || name.trim().length < 3) {
      setError('Full Name must be at least 3 characters long.');
      showToast('Full Name must be at least 3 characters long.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phone || !phoneRegex.test(phone)) {
      setError('Phone Number must be exactly 10 digits.');
      showToast('Phone Number must be exactly 10 digits.', 'error');
      return;
    }

    if (!city || city.trim().length < 2) {
      setError('City must be at least 2 characters long.');
      showToast('City must be at least 2 characters long.', 'error');
      return;
    }

    if (!stateName || stateName.trim().length < 2) {
      setError('State name must be at least 2 characters long.');
      showToast('State name must be at least 2 characters long.', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name,
        email,
        phone,
        customer_type: customerType,
        city,
        state: stateName,
      };

      // Inject referral code if present
      if (referralCode) {
        payload.referral_code = referralCode;
      }

      await API.post('/auth/signup', payload);
      showToast('Registration successful! Verification OTP sent to email.', 'success');
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=signup&redirect=${encodeURIComponent(redirectPath)}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Check if phone is already registered.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-lg w-full p-8 bg-white border border-slate-100 shadow-xl rounded-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-slate-500">Sign up to buy, rent secondhand vehicles and earn referrals</p>
        </div>

        {referralCode && (
          <div className="mb-6 p-3 bg-accent-50 text-accent-700 text-xs font-semibold rounded-lg border border-accent-100 flex items-center space-x-2">
            <Share2 size={14} className="animate-pulse" />
            <span>Referral code [{referralCode}] will be linked to your new profile.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-100 flex items-center space-x-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Phone Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  minLength={10}
                  maxLength={10}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="+919876543210"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">City</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <MapPin size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="Chennai"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">State</label>
              <input
                type="text"
                required
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                placeholder="Tamil Nadu"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Type</label>
            <div className="flex items-center space-x-6">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                  value="buyer"
                  checked={customerType === 'buyer'}
                  onChange={() => setCustomerType('buyer')}
                />
                <span className="ml-2 text-sm text-slate-700 font-medium">Buyer</span>
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                  value="lender"
                  checked={customerType === 'lender'}
                  onChange={() => setCustomerType('lender')}
                />
                <span className="ml-2 text-sm text-slate-700 font-medium">Lender</span>
              </label>
            </div>
          </div>

          <Button variant="primary" type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'Submitting registration details...' : 'Create Account & Send OTP'}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <button onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`)} className="text-brand-600 font-semibold hover:underline">
            Sign In here
          </button>
        </div>
      </Card>
    </div>
  );
};
export default Register;
