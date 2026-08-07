"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, ShoppingBag, LogOut, X, CheckCircle, AlertCircle } from "lucide-react";


export type ConfirmVariant = "danger" | "warning" | "success";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconBg: "rgba(239,68,68,0.1)",
    iconBorder: "rgba(239,68,68,0.2)",
    iconColor: "#ef4444",
    btnBg: "#ef4444",
    btnHover: "#dc2626",
    ringColor: "rgba(239,68,68,0.15)",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "rgba(245,158,11,0.1)",
    iconBorder: "rgba(245,158,11,0.2)",
    iconColor: "#f59e0b",
    btnBg: "#f59e0b",
    btnHover: "#d97706",
    ringColor: "rgba(245,158,11,0.15)",
  },
  success: {
    icon: CheckCircle,
    iconBg: "rgba(34,197,94,0.1)",
    iconBorder: "rgba(34,197,94,0.2)",
    iconColor: "#22c55e",
    btnBg: "#22c55e",
    btnHover: "#16a34a",
    ringColor: "rgba(34,197,94,0.15)",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when open (critical for mobile - prevents bg scrolling)
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // Auto-focus cancel button so keyboard/screen reader users are oriented
      setTimeout(() => cancelRef.current?.focus(), 80);
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: "100%", maxWidth: "380px",
              background: "#111118",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "20px",
              boxShadow: `0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${cfg.ringColor}`,
              overflow: "hidden",
              padding: "28px 28px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0",
            }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: "54px", height: "54px", borderRadius: "16px",
                background: cfg.iconBg,
                border: `1px solid ${cfg.iconBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "18px",
                boxShadow: `0 0 30px ${cfg.ringColor}`,
              }}
            >
              <Icon size={24} color={cfg.iconColor} />
            </motion.div>

            {/* Title */}
            <motion.h3
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                fontSize: "16px", fontWeight: "700", color: "var(--text-primary)",
                textAlign: "center", lineHeight: 1.3, marginBottom: "8px",
              }}
            >
              {title}
            </motion.h3>

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.13 }}
                style={{
                  fontSize: "13px", color: "var(--text-muted)",
                  textAlign: "center", lineHeight: 1.5, marginBottom: "24px",
                }}
              >
                {description}
              </motion.p>
            )}

            {!description && <div style={{ height: "20px" }} />}

            {/* Divider */}
            <div style={{
              width: "100%", height: "1px",
              background: "rgba(255,255,255,0.06)",
              marginBottom: "18px",
            }} />

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              style={{ display: "flex", gap: "10px", width: "100%" }}
            >
              <button
                ref={cancelRef}
                onClick={onCancel}
                disabled={loading}
                style={{
                  flex: 1, height: "40px", borderRadius: "11px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer", fontSize: "13px", fontWeight: "600",
                  color: "var(--text-secondary)", transition: "all 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                {cancelLabel}
              </button>
              <motion.button
                onClick={onConfirm}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                style={{
                  flex: 1, height: "40px", borderRadius: "11px",
                  background: cfg.btnBg,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: "700",
                  color: "#fff", transition: "all 0.15s",
                  opacity: loading ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = cfg.btnHover; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = cfg.btnBg; }}
              >
                {loading ? (
                  <span style={{
                    width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite", display: "inline-block",
                  }} />
                ) : <Icon size={13} />}
                {loading ? "Aguarde..." : confirmLabel}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
