"use client";
import { useEffect } from "react";

/**
 * Locks body scroll when `isLocked` is true.
 * Useful for modals and overlays — prevents background scrolling.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      document.body.classList.add("modal-open");
      // Scroll to top so modal is always visible
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isLocked]);
}
