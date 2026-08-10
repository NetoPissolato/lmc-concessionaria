"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Observes all `.s-reveal` elements and adds `.s-revealed` when they enter
 * the viewport.
 *
 * KEY: depends on `pathname` so it re-runs on every Next.js client-side
 * navigation — not just on the initial page load / hard refresh.
 *
 * NOTE: Never add `s-reveal` to above-the-fold / critical content.
 *       Those elements should always be visible.
 */
export function useScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    let obs: IntersectionObserver | null = null;

    // Wait for React to paint the new route's DOM
    const timer = setTimeout(() => {
      obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("s-revealed");
              obs?.unobserve(e.target);
            }
          });
        },
        // Low threshold + no bottom margin = reveal as soon as element appears
        { threshold: 0.05, rootMargin: "0px 0px 0px 0px" }
      );

      document
        .querySelectorAll(".s-reveal:not(.s-revealed)")
        .forEach((el) => obs!.observe(el));
    }, 80);

    return () => {
      clearTimeout(timer);
      obs?.disconnect();
    };
  }, [pathname]);
}

/**
 * Animates number counters on `.data-count-target` elements.
 * Re-runs on route change.
 */
export function useCountUp() {
  const pathname = usePathname();

  useEffect(() => {
    let obs: IntersectionObserver | null = null;

    const timer = setTimeout(() => {
      obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            const raw = el.dataset.countTarget ?? "";
            const suffix = raw.replace(/[\d.]/g, "");
            const target = parseFloat(raw.replace(/[^\d.]/g, ""));
            if (isNaN(target)) return;

            const duration = 1400;
            const start = performance.now();
            const decimals = raw.includes(".") ? 1 : 0;

            function tick(now: number) {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              const current = target * ease;
              el.textContent =
                (decimals
                  ? current.toFixed(1)
                  : Math.round(current).toLocaleString("pt-BR")) + suffix;
              if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            obs?.unobserve(el);
          });
        },
        { threshold: 0.5 }
      );

      document
        .querySelectorAll("[data-count-target]")
        .forEach((el) => obs!.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      obs?.disconnect();
    };
  }, [pathname]);
}
