"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

type ToastVariant = "error" | "success" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting: boolean;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: "border-error bg-error/5",
  success: "border-accent2 bg-accent2/5",
  info: "border-txt bg-bg2",
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant, exiting: false }]);

      // Start exit animation after 2.8s, remove after 3s
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
      }, 2800);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto font-display text-base tracking-wide px-6 py-3 bg-bg border-2 border-txt shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] ${VARIANT_STYLES[t.variant]} ${t.exiting ? "animate-toast-out" : "animate-toast-in"}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
