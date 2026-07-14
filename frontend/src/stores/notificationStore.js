import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  banner: null, // { message, type: 'success' | 'error' | 'warning' }
  toasts: [], // array of { id, message, type: 'success' | 'error' | 'warning' }

  showBanner: (message, type = 'error') => {
    set({ banner: { message, type } });
  },

  clearBanner: () => {
    set({ banner: null });
  },

  showToast: (message, type = 'error') => {
    const id = Date.now() + Math.random().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));
