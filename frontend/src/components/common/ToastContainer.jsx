import React from 'react';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-xl border shadow-xl flex items-start space-x-3 pointer-events-auto transition-all duration-300 animate-slide-in-right ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : toast.type === 'warning'
              ? 'bg-amber-955/90 border-amber-800 text-amber-200'
              : 'bg-rose-955/90 border-rose-900 text-rose-200'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' ? (
              <CheckCircle size={16} className="text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="text-rose-400" />
            )}
          </div>
          
          <div className="flex-grow text-xs font-semibold leading-relaxed">
            {toast.message}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-slate-450 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
export default ToastContainer;
