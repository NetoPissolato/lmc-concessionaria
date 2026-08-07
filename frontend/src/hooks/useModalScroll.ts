"use client";

import { useEffect, useRef, RefObject } from "react";

/**
 * useModalScroll
 * 
 * When `open` becomes true:
 *  1. Locks body scroll so the background page doesn't scroll behind the modal
 *  2. Scrolls `elementRef` into view (useful for inline panels/drawers)
 * 
 * Usage:
 *   const modalRef = useModalScroll(isOpen);
 *   <div ref={modalRef}>...</div>
 */
export function useModalScroll<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  options?: { lockScroll?: boolean; scrollIntoView?: boolean; behavior?: ScrollBehavior }
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { lockScroll = true, scrollIntoView = true, behavior = "smooth" } = options ?? {};

  useEffect(() => {
    if (!open) return;

    // 1. Lock body scroll
    let prevOverflow = "";
    if (lockScroll) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    // 2. Scroll element into view (for inline panels)
    if (scrollIntoView && ref.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior, block: "nearest" });
      }, 60);
    }

    return () => {
      if (lockScroll) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [open, lockScroll, scrollIntoView, behavior]);

  return ref;
}

/**
 * useBodyScrollLock
 * 
 * Simple body scroll lock - use directly in overlay/fixed modal components.
 * Prevents the background page from scrolling while a modal is open.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}
