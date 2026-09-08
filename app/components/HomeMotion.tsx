"use client";

import { useEffect } from "react";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Progressive enhancement: keep the original AUTO 9 scrolling, plus a subtle hero fade on exit. */
export function HomeMotion() {
  useEffect(() => {
    const root = document.getElementById("auto9-home");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const running = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();

    let observer: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window && "animate" in Element.prototype) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (
              !entry.isIntersecting ||
              reducedMotion.matches ||
              seen.has(entry.target)
            ) {
              continue;
            }

            const element = entry.target as HTMLElement;
            seen.add(element);
            observer?.unobserve(element);

            if (element.contains(document.activeElement)) continue;

            const animation = element.animate(
              [
                {
                  opacity: 0.15,
                  translate: `0 ${compact.matches ? 14 : 28}px`,
                },
                { opacity: 1, translate: "0 0" },
              ],
              {
                duration: compact.matches ? 480 : 760,
                delay: compact.matches
                  ? 0
                  : Number(element.dataset.motionDelay || 0),
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                fill: "backwards",
              },
            );

            running.set(element, animation);
            animation.onfinish = () => running.delete(element);
          }
        },
        { threshold: 0.08 },
      );
    }

    const cancelAnimations = () => {
      running.forEach((animation) => animation.cancel());
      running.clear();
    };

    const observe = () => {
      observer?.disconnect();
      cancelAnimations();
      if (!observer || reducedMotion.matches) return;

      root
        .querySelectorAll<HTMLElement>("[data-motion-reveal]")
        .forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.height && rect.top < window.innerHeight && rect.bottom > 0) {
            seen.add(element);
          }
          if (!seen.has(element)) observer?.observe(element);
        });
    };

    // Keep only the hero fade/parallax effect from the last test.
    const heroes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-home-hero]"),
    );

    let heroRaf = 0;

    const updateHeroMotion = () => {
      heroRaf = 0;

      for (const hero of heroes) {
        if (hero.offsetHeight === 0) continue;

        const rect = hero.getBoundingClientRect();
        const travel = Math.max(280, hero.offsetHeight * 0.58);
        const progress = clamp01(-rect.top / travel);
        const fade = 1 - progress;

        hero
          .querySelectorAll<HTMLElement>("[data-hero-fade]")
          .forEach((element) => {
            element.style.opacity = String(fade);
            element.style.transform = `translate3d(0, ${-progress * (compact.matches ? 20 : 42)}px, 0)`;
            element.style.filter = `blur(${progress * (compact.matches ? 3 : 6)}px)`;
            element.style.pointerEvents = progress > 0.92 ? "none" : "";
          });

        hero
          .querySelectorAll<HTMLElement>("[data-hero-media]")
          .forEach((element) => {
            element.style.transform = `translate3d(0, ${progress * (compact.matches ? 10 : 22)}px, 0) scale(${1 + progress * 0.025})`;
          });

        hero
          .querySelectorAll<HTMLElement>("[data-hero-veil]")
          .forEach((element) => {
            element.style.opacity = String(progress * 0.62);
          });
      }
    };

    const requestHeroMotion = () => {
      if (reducedMotion.matches || heroRaf) return;
      heroRaf = window.requestAnimationFrame(updateHeroMotion);
    };

    const resetHeroMotion = () => {
      for (const hero of heroes) {
        hero
          .querySelectorAll<HTMLElement>(
            "[data-hero-fade], [data-hero-media], [data-hero-veil]",
          )
          .forEach((element) => {
            element.style.removeProperty("opacity");
            element.style.removeProperty("transform");
            element.style.removeProperty("filter");
            element.style.removeProperty("pointer-events");
          });
      }
    };

    const handleMotionPreference = () => {
      observe();
      if (reducedMotion.matches) resetHeroMotion();
      else requestHeroMotion();
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
    requestHeroMotion();

    reducedMotion.addEventListener("change", handleMotionPreference);
    root.addEventListener("focusin", handleFocus);
    window.addEventListener("scroll", requestHeroMotion, { passive: true });
    window.addEventListener("resize", requestHeroMotion, { passive: true });

    return () => {
      observer?.disconnect();
      cancelAnimations();
      if (heroRaf) window.cancelAnimationFrame(heroRaf);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      root.removeEventListener("focusin", handleFocus);
      window.removeEventListener("scroll", requestHeroMotion);
      window.removeEventListener("resize", requestHeroMotion);
    };
  }, []);

  return null;
}
