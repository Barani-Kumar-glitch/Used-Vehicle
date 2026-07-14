import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReferralStore } from '../stores/referralStore.js';

export const ReferralTracker = () => {
  const [searchParams] = useSearchParams();
  const setReferralCode = useReferralStore((state) => state.setReferralCode);

  useEffect(() => {
    // 1. Try to get ref directly from the current URL
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
    } else {
      // 2. If not directly present, check if there is a nested redirect query param containing ref
      const redirect = searchParams.get('redirect');
      if (redirect) {
        try {
          const decodedRedirect = decodeURIComponent(redirect);
          const match = decodedRedirect.match(/[?&]ref=([^&]+)/);
          if (match && match[1]) {
            setReferralCode(match[1]);
          }
        } catch (e) {
          console.error('Failed to parse redirect param for referral code:', e);
        }
      }
    }
  }, [searchParams, setReferralCode]);

  return null;
};

export default ReferralTracker;
