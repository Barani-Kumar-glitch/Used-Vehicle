import { create } from 'zustand';

export const useReferralStore = create((set) => ({
  referralCode: sessionStorage.getItem('capturedReferralCode') || null,
  
  setReferralCode: (code) => {
    if (code) {
      sessionStorage.setItem('capturedReferralCode', code);
      set({ referralCode: code });
    }
  },
  
  clearReferralCode: () => {
    sessionStorage.removeItem('capturedReferralCode');
    set({ referralCode: null });
  }
}));
