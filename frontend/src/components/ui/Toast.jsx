import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    info: (msg) => addToast(msg, 'info'),
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    warning: (msg) => addToast(msg, 'warning', 5000),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Annunciator Viewport */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3 rounded bg-[#20272b] text-[#f2f4f4] border border-[#55636c] shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
            role="alert"
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-[#f15b22]" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`led-lamp ${
                    t.type === 'success'
                      ? 'led-green'
                      : t.type === 'error'
                      ? 'led-orange'
                      : t.type === 'warning'
                      ? 'led-amber'
                      : 'led-off'
                  }`}
                />
                <span className="font-mono text-[10px] font-bold tracking-wider text-[#d8dee1] uppercase">
                  {t.type} ANNUNCIATOR
                </span>
              </div>
              <p className="font-sans text-xs text-white leading-snug">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-[#84929a] hover:text-white transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;

