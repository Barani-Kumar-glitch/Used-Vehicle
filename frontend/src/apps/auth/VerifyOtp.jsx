import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '../../components/common/UI.jsx';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useReferralStore } from '../../stores/referralStore.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export const VerifyOtp = () => {
  const { showToast } = useNotificationStore();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const purpose = searchParams.get('purpose') || 'login';
  const redirectPath = searchParams.get('redirect') || '/buy';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60); // 60 seconds for resend lock
  
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const setCustomerAuth = useAuthStore((state) => state.setCustomerAuth);

  // 5-minute expiry countdown
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // 60-second resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input box
    if (element.value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const referralCode = useReferralStore.getState().referralCode;
      const res = await API.post('/auth/verify-otp', {
        email,
        code: otpCode,
        referral_code: referralCode || null,
      });

      // Save user state & token
      setCustomerAuth(res.data.customer, res.data.accessToken);

      // Clear referral code after successful verification/login
      const clearReferralCode = useReferralStore.getState().clearReferralCode;
      clearReferralCode();
      
      // Redirect based on customer type
      let finalRedirect = redirectPath;
      if (redirectPath === '/buy') {
        if (res.data.customer.customer_type === 'lender') {
          finalRedirect = '/rent';
        }
      }
      showToast('Verification successful! Welcome.', 'success');
      navigate(finalRedirect);

    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed. Try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setError('');
    setResendTimer(60);
    setCanResend(false);
    setTimer(300); // Reset main timer

    try {
      await API.post('/auth/send-otp', { email, purpose });
      showToast('A new OTP has been sent to your email.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend verification OTP';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 bg-white border border-slate-100 shadow-xl rounded-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-50 text-brand-600 mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Security Verification</h2>
          <p className="mt-2 text-sm text-slate-500">
            We sent a verification code to <span className="font-semibold text-slate-700">{email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-100 flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between space-x-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                ref={(el) => (inputRefs.current[index] = el)}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              />
            ))}
          </div>

          <div className="text-center text-sm text-slate-500">
            {timer > 0 ? (
              <span>Code expires in <span className="font-semibold text-slate-700">{formatTime(timer)}</span></span>
            ) : (
              <span className="text-rose-600 font-semibold">OTP Expired</span>
            )}
          </div>

          <Button variant="primary" type="submit" disabled={loading || timer <= 0} className="w-full py-3.5">
            {loading ? 'Verifying code...' : 'Confirm Verification Code'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Didn't receive a code?</span>
          <button
            onClick={handleResend}
            disabled={!canResend}
            className={`flex items-center space-x-1 font-semibold focus:outline-none ${
              canResend ? 'text-brand-600 hover:underline' : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={12} className={!canResend ? '' : 'animate-spin-once'} />
            <span>{canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}</span>
          </button>
        </div>
      </Card>
    </div>
  );
};
export default VerifyOtp;
