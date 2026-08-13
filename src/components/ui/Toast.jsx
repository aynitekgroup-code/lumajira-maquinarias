import { createContext, useCallback, useContext, useState } from 'react';
import { colors, radius } from '../../styles/theme';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const typeStyles = {
    info: { bg: colors.bgCard, border: colors.border, color: colors.text },
    success: { bg: colors.successBg, border: colors.successBorder, color: colors.success },
    error: { bg: colors.criticalBg, border: colors.criticalBorder, color: colors.critical },
    warning: { bg: colors.warningBg, border: colors.warningBorder, color: colors.warning },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: 'min(420px, calc(100vw - 2rem))',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const s = typeStyles[t.type] || typeStyles.info;
          return (
            <div
              key={t.id}
              className="toast-item"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.color,
                borderRadius: radius.md,
                padding: '0.875rem 1rem',
                fontSize: '0.9rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
