import React from 'react';

// Spinner / Loader
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 w-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };
  return (
    <div className={`animate-spin rounded-full border-t-brand-600 border-r-transparent border-b-brand-600 border-l-transparent ${sizeClasses[size] || sizeClasses.md} ${className}`} />
  );
};

// Premium Button
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white shadow-md hover:shadow-lg focus:ring-brand-500',
    secondary: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 focus:ring-slate-400',
    accent: 'bg-gradient-to-r from-accent-600 to-accent-700 hover:from-accent-700 hover:to-accent-800 text-white shadow-md hover:shadow-lg focus:ring-accent-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// Badge Component
export const Badge = ({ children, color = 'gray', className = '' }) => {
  const colors = {
    gray: 'bg-slate-100 text-slate-700 border border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    blue: 'bg-sky-50 text-sky-700 border border-sky-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize ${colors[color] || colors.gray} ${className}`}>
      {children}
    </span>
  );
};

// Card Container
export const Card = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover-slide ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

// Table Component
export const Table = ({ headers = [], children, className = '', variant = 'light' }) => {
  const isDark = variant === 'dark';
  return (
    <div className={`overflow-x-auto rounded-xl border shadow-sm ${
      isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'
    } ${className}`}>
      <table className="min-w-full">
        <thead className={isDark ? 'bg-slate-900/80 border-b border-slate-850' : 'bg-slate-50'}>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y text-sm ${
          isDark ? 'divide-slate-800/60 bg-slate-950/10 text-slate-300' : 'divide-slate-100 bg-white text-slate-700'
        }`}>
          {children}
        </tbody>
      </table>
    </div>
  );
};

// Modal Component
export const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus:outline-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
