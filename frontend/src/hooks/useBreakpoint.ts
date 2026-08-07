"use client";

import { useState, useEffect } from "react";

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BREAKPOINTS = {
  xs:  360,
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  "2xl": 1536,
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

interface BreakpointState {
  width: number;
  isMobile:      boolean; // < 640px
  isTablet:      boolean; // 640px – 1023px
  isDesktop:     boolean; // ≥ 1024px
  isLargeScreen: boolean; // ≥ 1280px
  // Fine-grained
  isXs:  boolean; // < 360px
  isSm:  boolean; // 640px – 767px
  isMd:  boolean; // 768px – 1023px
  isLg:  boolean; // 1024px – 1279px
  isXl:  boolean; // ≥ 1280px
  // Compound helpers
  isMobileOrTablet: boolean; // < 1024px
}

function getState(width: number): BreakpointState {
  return {
    width,
    isMobile:      width < BREAKPOINTS.sm,
    isTablet:      width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg,
    isDesktop:     width >= BREAKPOINTS.lg,
    isLargeScreen: width >= BREAKPOINTS.xl,

    isXs: width < BREAKPOINTS.xs,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl,

    isMobileOrTablet: width < BREAKPOINTS.lg,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBreakpoint(): BreakpointState {
  // SSR-safe: start with a large default so desktop renders fine on server
  const [state, setState] = useState<BreakpointState>(() => getState(1280));

  useEffect(() => {
    // Set real width on client mount
    setState(getState(window.innerWidth));

    const ro = new ResizeObserver(() => {
      setState(getState(window.innerWidth));
    });
    ro.observe(document.documentElement);

    return () => ro.disconnect();
  }, []);

  return state;
}

// ─── Helper: check specific breakpoint ───────────────────────────────────────
export function useIsAbove(bp: BreakpointKey): boolean {
  const { width } = useBreakpoint();
  return width >= BREAKPOINTS[bp];
}

export function useIsBelow(bp: BreakpointKey): boolean {
  const { width } = useBreakpoint();
  return width < BREAKPOINTS[bp];
}
