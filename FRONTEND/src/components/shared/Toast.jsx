/**
 * components/shared/Toast.jsx
 * Lightweight toast notification system.
 * Usage:
 *   const { addToast } = useToast();
 *   addToast('Saved!', 'success');
 *   addToast('Something went wrong', 'error');
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

const STYLES = {
  success: 'border-sage/40 bg-sage/10 text-sage',
  error:   'border-red-500/40 bg-red-500/10 text-red-300',
  info:    'border-frost/40 bg-frost/10 text-frost',
  warning: 'border-gold/40 bg-gold/10 text-gold',
};

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [toast, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md
        shadow-2xl min-w-[260px] max-w-[340px] animate-fade-up
        ${STYLES[toast.type] ?? STYLES.info}
      `}
      style={{ animationDuration: '0.25s' }}
    >
      <span className="text-sm font-bold shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <p className="text-sm font-body leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-auto text-current opacity-50 hover:opacity-100 text-lg leading-none shrink-0"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — fixed top-right on desktop, top-center on mobile */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}