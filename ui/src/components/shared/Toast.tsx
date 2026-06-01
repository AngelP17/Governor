import { CheckCircle, Info, Warning, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { border: string; bg: string; text: string; accent: string; Icon: typeof CheckCircle }> = {
  success: { border: "border-emerald-400/30", bg: "bg-emerald-400/12", text: "text-emerald-100", accent: "text-emerald-200", Icon: CheckCircle },
  info: { border: "border-sky-400/30", bg: "bg-sky-400/10", text: "text-sky-100", accent: "text-sky-200", Icon: Info },
  warning: { border: "border-amber-400/30", bg: "bg-amber-400/10", text: "text-amber-100", accent: "text-amber-200", Icon: Warning },
  error: { border: "border-rose-400/30", bg: "bg-rose-400/12", text: "text-rose-100", accent: "text-rose-200", Icon: Warning },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `T-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const styles = VARIANT_STYLES[toast.variant];
            const Icon = styles.Icon;
            return (
              <motion.div
                key={toast.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${styles.border} ${styles.bg} p-3.5 pr-2.5 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur`}
              >
                <Icon size={18} weight="fill" className={`mt-0.5 shrink-0 ${styles.accent}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${styles.text}`}>{toast.title}</p>
                  {toast.description ? <p className="mt-0.5 text-xs leading-5 text-slate-300/80">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={14} weight="bold" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
