"use client";

import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecionar...",
  disabled = false,
  error = false,
  style,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find((o) => o.value === value);

  // Ensure portal is only used client-side
  useEffect(() => { setMounted(true); }, []);

  // Calculate dropdown position using viewport coordinates (position: fixed)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const listH = Math.min(options.length * 44 + 16, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldDropUp = spaceBelow < listH + 8 && spaceAbove > listH + 8;
    setDropUp(shouldDropUp);
    setDropStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      ...(shouldDropUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  };

  // Recalculate on open and on scroll/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    // Capture phase catches scroll in any scrollable ancestor
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options.length]);

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      const target = (e as MouseEvent).target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); }
    if (e.key === "Escape") setOpen(false);
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    if (e.key === "ArrowDown") { e.preventDefault(); const next = options[idx + 1]; if (next) onChange(next.value); }
    if (e.key === "ArrowUp")   { e.preventDefault(); const prev = options[idx - 1]; if (prev) onChange(prev.value); }
  };

  const dropdown = (
    <motion.div
      ref={listRef}
      role="listbox"
      key="select-dropdown"
      initial={{ opacity: 0, y: dropUp ? 6 : -6, scaleY: 0.92 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: dropUp ? 6 : -6, scaleY: 0.92 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      style={{
        ...dropStyle,
        background: "var(--surface-3)",
        border: "1px solid var(--border-hover)",
        borderRadius: 12,
        overflow: "hidden auto",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
        maxHeight: 260,
        padding: "6px",
        transformOrigin: dropUp ? "bottom center" : "top center",
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => { onChange(opt.value); setOpen(false); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: isSelected ? "rgba(245,166,35,0.12)" : "transparent",
              color: isSelected ? "#f5a623" : "var(--text-primary)",
              fontSize: 13,
              fontFamily: "inherit",
              fontWeight: isSelected ? 600 : 400,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.1s, color 0.1s",
              minHeight: 40,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <span>{opt.label}</span>
            {isSelected && <Check size={13} color="#f5a623" />}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <div style={{ position: "relative", width: "100%", ...style }} className={className}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKey}
        style={{
          width: "100%",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 12px",
          background: "var(--surface-2)",
          border: `1px solid ${error ? "var(--error)" : open ? "rgba(245,166,35,0.5)" : "var(--border)"}`,
          borderRadius: "var(--radius-md)",
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 13,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
          boxShadow: open ? "0 0 0 3px var(--brand-light)" : error ? "0 0 0 3px var(--error-light)" : "none",
          textAlign: "left",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ display: "flex", flexShrink: 0, color: "var(--text-muted)" }}
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>

      {/* Render dropdown in a Portal to avoid being clipped by any ancestor overflow */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && dropdown}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
