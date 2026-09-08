"use client";

import { useEffect } from "react";

/** Progressive enhancement: content is visible before JS and without animation support. */
export function HomeMotion() {
  useEffect(() => {
    const root = document.getElementById("auto9-home");
    if (!root || !("IntersectionObserver" in window) || !("animate" in Element.prototype)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const running = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || reducedMotion.matches || seen.has(entry.target)) continue;
        const element = entry.target as HTMLElement;
        seen.add(element);
        observer.unobserve(element);
        // Do not animate content someone is already interacting with.
        if (element.contains(document.activeElement)) continue;
        const animation = element.animate(
          [
            { opacity: 0.15, translate: `0 ${compact.matches ? 14 : 28}px` },
            { opacity: 1, translate: "0 0" },
          ],
          {
            duration: compact.matches ? 480 : 760,
            delay: compact.matches ? 0 : Number(element.dataset.motionDelay || 0),
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "backwards",
          },
        );
        running.set(element, animation);
        animation.onfinish = () => running.delete(element);
      }
    }, { threshold: 0.08 });

    const cancelAnimations = () => {
      running.forEach((animation) => animation.cancel());
      running.clear();
    };
    const observe = () => {
      observer.disconnect();
      cancelAnimations();
      if (reducedMotion.matches) return;
      root.querySelectorAll<HTMLElement>("[data-motion-reveal]").forEach((element) => {
        // Leave the initial viewport (and restored scroll positions) immediately readable.
        const rect = element.getBoundingClientRect();
        if (rect.height && rect.top < window.innerHeight && rect.bottom > 0) seen.add(element);
        if (!seen.has(element)) observer.observe(element);
      });
    };
    const handleFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Node)) return;
      for (const [element, animation] of running) {
        if (element.contains(event.target)) {
          animation.cancel();
          running.delete(element);
        }
      }
    };

    observe();
    reducedMotion.addEventListener("change", observe);
    root.addEventListener("focusin", handleFocus);
    return () => {
      observer.disconnect();
      cancelAnimations();
      reducedMotion.removeEventListener("change", observe);
      root.removeEventListener("focusin", handleFocus);
    };
  }, []);

  return null;
}
