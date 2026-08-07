"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<{
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ─── Icons map ────────────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: AlertCircle,
};

const COLORS: Record<ToastType, string> = {
  success: "#10b981",
  error:   "#ef4444",
  info:    "#3b82f6",
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for toast events dispatched by src/lib/toast.ts
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      add(String(message), type as ToastType);
    };
    window.addEventListener("lmc-toast", handler);
    return () => window.removeEventListener("lmc-toast", handler);
  }, [add]);

  return (
    <ToastContext.Provider
      value={{
        success: (msg) => add(msg, "success"),
        error: (msg) => add(msg, "error"),
        info: (msg) => add(msg, "info"),
      }}
    >
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            const color = COLORS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#16161f",
                  border: `1px solid ${color}30`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: "10px",
                  padding: "12px 16px",
                  minWidth: "280px",
                  maxWidth: "380px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  pointerEvents: "auto",
                  cursor: "default",
                }}
              >
                <Icon size={17} color={color} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: "14px",
                    color: "#f1f5f9",
                    fontFamily: "Inter, sans-serif",
                    flex: 1,
                    lineHeight: "1.4",
                  }}
                >
                  {t.message}
                </span>
                <button
                  onClick={() => remove(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#475569",
                    padding: "0",
                    display: "flex",
                    flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
