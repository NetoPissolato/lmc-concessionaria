"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body via a React Portal.
 * This ensures position: fixed works correctly even inside
 * elements with CSS transforms (e.g., framer-motion).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
