"use client";
import { useEffect } from "react";

/**
 * Locks body scroll when `isLocked` is true.
 * Prevents background from scrolling while a modal/overlay is open.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isLocked]);
}
