import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Context ── */
const ToastContext = createContext();

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};

/* ── Provider ── */
let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    info:    (msg, dur) => addToast(msg, 'info', dur),
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/* ── Container ── */
function ToastContainer({ toasts, dismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 100000,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
      maxWidth: 380,
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Individual Toast ── */
const TYPE_STYLES = {
  info:    { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.35)', color: '#a5b4fc', icon: 'ℹ️' },
  success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)', color: '#86efac', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', color: '#fca5a5', icon: '✕' },
  warning: { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)', color: '#fde68a', icon: '⚠' },
};

function Toast({ toast, onDismiss }) {
  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        backdropFilter: 'blur(16px)',
        color: s.color,
        fontSize: '0.9rem',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
      onClick={onDismiss}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{s.icon}</span>
      <span>{toast.message}</span>
    </motion.div>
  );
}
