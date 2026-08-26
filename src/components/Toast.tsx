import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-brand-200 bg-white text-ink-900',
  error: 'border-red-200 bg-white text-ink-900',
  warning: 'border-accent-200 bg-white text-ink-900',
  info: 'border-ink-200 bg-white text-ink-900',
};

const ICON_COLOR: Record<ToastType, string> = {
  success: 'text-brand-600',
  error: 'text-red-600',
  warning: 'text-accent-600',
  info: 'text-ink-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), 3200);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border shadow-card px-4 py-3 animate-slide-up ${STYLES[t.type]}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_COLOR[t.type]}`} />
              <p className="flex-1 text-sm leading-snug">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="btn-icon h-6 w-6 text-ink-400 hover:bg-ink-100 hover:text-ink-700 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
