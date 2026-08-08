"use client";
import { useRef, useEffect, useState, ReactNode, CSSProperties } from "react";

interface SwipeTableProps {
  children: ReactNode;
  style?: CSSProperties;
  /** If true, shows a "←  deslize →" hint on first render on mobile */
  showHint?: boolean;
}

/**
 * SwipeTable
 *
 * A wrapper that makes wide content (tables, grids, complex rows) horizontally
 * scrollable on mobile/tablet with:
 *  - Smooth touch scrolling (-webkit-overflow-scrolling: touch)
 *  - Gradient fade indicators on left/right edges when there's more content
 *  - Optional swipe hint label on first mount (mobile only)
 *
 * Usage:
 *   <SwipeTable>
 *     <table>...</table>
 *   </SwipeTable>
 */
export function SwipeTable({ children, style, showHint = true }: SwipeTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeft(scrollLeft > 8);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 8);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    // Show hint on mobile if content overflows
    const isMobile = window.innerWidth < 1024;
    if (showHint && isMobile && el.scrollWidth > el.clientWidth) {
      setHint(true);
      const t = setTimeout(() => setHint(false), 3000);
      return () => {
        el.removeEventListener("scroll", update);
        clearTimeout(t);
      };
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [showHint]);

  return (
    <div style={{ position: "relative", ...style }}>
      {/* Left gradient fade */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "32px",
          background: "linear-gradient(90deg, var(--surface, #111), transparent)",
          pointerEvents: "none", zIndex: 2,
          opacity: showLeft ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />
      {/* Right gradient fade */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "32px",
          background: "linear-gradient(270deg, var(--surface, #111), transparent)",
          pointerEvents: "none", zIndex: 2,
          opacity: showRight ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />

      {/* Swipe hint */}
      {hint && (
        <div style={{
          position: "absolute", bottom: "6px", left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)",
          borderRadius: "20px", padding: "3px 12px",
          fontSize: "10px", color: "rgba(245,166,35,0.9)",
          fontWeight: 600, letterSpacing: "0.05em",
          pointerEvents: "none", zIndex: 10,
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.3s ease",
        }}>
          ← deslize →
        </div>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        style={{
          overflowX: "auto",
          overflowY: "visible",
          WebkitOverflowScrolling: "touch" as CSSProperties["WebkitOverflowScrolling"],
          scrollbarWidth: "none" as CSSProperties["scrollbarWidth"],
          msOverflowStyle: "none",
          paddingBottom: "4px",
        } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
