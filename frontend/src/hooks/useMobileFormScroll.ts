"use client";
import { useEffect } from "react";

/**
 * useMobileFormScroll
 *
 * On mobile, when the virtual keyboard opens it covers ~40% of the screen.
 * Input fields near the bottom get hidden behind the keyboard, making them
 * unusable. This hook listens for "focus" events on all inputs/textareas/selects
 * inside a container and scrolls the focused field into view, above the keyboard.
 *
 * Usage:
 *   const formRef = useRef<HTMLDivElement>(null);
 *   useMobileFormScroll(formRef);
 */
import { useRef, RefObject } from "react";

export function useMobileFormScroll(
  containerRef?: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    // Only activate on touch devices
    if (typeof window === "undefined" || !("ontouchstart" in window)) return;

    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      // Give the keyboard time to appear (~300ms) before scrolling
      setTimeout(() => {
        const vv = window.visualViewport;

        if (vv) {
          // visualViewport gives us the actual visible area above the keyboard
          const elementRect = target.getBoundingClientRect();
          const visibleBottom = vv.offsetTop + vv.height;
          const elementBottom = elementRect.bottom + 20; // 20px breathing room

          if (elementBottom > visibleBottom) {
            // Scroll the page so the field appears above the keyboard
            window.scrollBy({
              top: elementBottom - visibleBottom,
              behavior: "smooth",
            });
          }
        } else {
          // Fallback for older browsers
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    };

    const root = containerRef?.current ?? document;
    root.addEventListener("focus", handleFocus, true);
    return () => root.removeEventListener("focus", handleFocus, true);
  }, [containerRef]);
}
