"use client";

import { useEffect, useRef } from "react";

interface SwipeOptions {
  onSwipeLeft?:  () => void;
  onSwipeRight?: () => void;
  onSwipeUp?:    () => void;
  onSwipeDown?:  () => void;
  /** Minimum px distance to trigger swipe (default: 50) */
  threshold?: number;
  /** Only trigger swipe from edge within this px range (default: no limit) */
  edgeThreshold?: number;
  /** Element ref to attach listeners to (default: document) */
  elementRef?: React.RefObject<HTMLElement | null>;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  edgeThreshold,
  elementRef,
}: SwipeOptions): void {
  const touchRef = useRef<TouchState | null>(null);

  useEffect(() => {
    const target = (elementRef?.current ?? document) as EventTarget;

    const handleTouchStart = (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      touchRef.current = {
        startX:    touch.clientX,
        startY:    touch.clientY,
        startTime: Date.now(),
      };
    };

    const handleTouchEnd = (e: Event) => {
      if (!touchRef.current) return;
      const touch = (e as TouchEvent).changedTouches[0];
      const { startX, startY, startTime } = touchRef.current;

      const dx   = touch.clientX - startX;
      const dy   = touch.clientY - startY;
      const dt   = Date.now() - startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Ignore slow swipes > 600ms or too short
      if (dt > 600) return;
      if (absDx < threshold && absDy < threshold) return;

      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0 && onSwipeRight) {
          // Only trigger from left edge if edgeThreshold is set
          if (edgeThreshold === undefined || startX <= edgeThreshold) {
            onSwipeRight();
          }
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (dy > 0 && onSwipeDown) onSwipeDown();
        else if (dy < 0 && onSwipeUp) onSwipeUp();
      }

      touchRef.current = null;
    };

    target.addEventListener("touchstart", handleTouchStart, { passive: true });
    target.addEventListener("touchend",   handleTouchEnd,   { passive: true });

    return () => {
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchend",   handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, edgeThreshold, elementRef]);
}
