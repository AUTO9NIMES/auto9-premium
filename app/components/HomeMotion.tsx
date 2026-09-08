"use client";

import { useEffect } from "react";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Progressive enhancement for the AUTO 9 homepage.
 * - soft section reveals
 * - Emergent-style hero fade/parallax while scrolling away
 * - lightweight inertial wheel scrolling on desktop only
 * Touch devices keep their native momentum scrolling.
 */
export function HomeMotion() {
  useEffect(() => {
    const root = document.getElementById("auto9-home");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const running = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();

    // ------------------------------------------------------------------
    // 1. Soft reveal for sections entering the viewport.
    // ------------------------------------------------------------------
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

            // Do not animate content someone is already interacting with.
            if (element.contains(document.activeElement)) continue;

            const animation = element.animate(
              [
                {
                  opacity: 0,
                  filter: `blur(${compact.matches ? 3 : 7}px)`,
                  transform: `translate3d(0, ${compact.matches ? 18 : 34}px, 0) scale(.992)`,
                },
                {
                  opacity: 1,
                  filter: "blur(0px)",
                  transform: "translate3d(0, 0, 0) scale(1)",
                },
              ],
              {
                duration: compact.matches ? 620 : 920,
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
        {
          threshold: 0.06,
          rootMargin: "0px 0px -4% 0px",
        },
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
          // Leave the initial viewport (and restored scroll positions) readable.
          const rect = element.getBoundingClientRect();
          if (
            rect.height &&
            rect.top < window.innerHeight * 0.92 &&
            rect.bottom > 0
          ) {
            seen.add(element);
          }

          if (!seen.has(element)) observer?.observe(element);
        });
    };

    // ------------------------------------------------------------------
    // 2. Fade the top hero away progressively while the next section rises.
    // ------------------------------------------------------------------
    const heroes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-home-hero]"),
    );

    let heroRaf = 0;

    const updateHeroMotion = () => {
      heroRaf = 0;

      for (const hero of heroes) {
        if (hero.offsetHeight === 0) continue;

        const rect = hero.getBoundingClientRect();
        const travel = Math.max(320, hero.offsetHeight * 0.72);
        const progress = clamp01(-rect.top / travel);
        const fade = 1 - progress;

        hero
          .querySelectorAll<HTMLElement>("[data-hero-fade]")
          .forEach((element) => {
            element.style.opacity = String(Math.max(0, fade));
            element.style.transform = `translate3d(0, ${-progress * (compact.matches ? 26 : 54)}px, 0) scale(${1 - progress * 0.018})`;
            element.style.filter = `blur(${progress * (compact.matches ? 4 : 8)}px)`;
            element.style.pointerEvents = progress > 0.92 ? "none" : "";
          });

        hero
          .querySelectorAll<HTMLElement>("[data-hero-media]")
          .forEach((element) => {
            element.style.transform = `translate3d(0, ${progress * (compact.matches ? 16 : 34)}px, 0) scale(${1.015 + progress * 0.035})`;
            element.style.filter = `brightness(${1 - progress * 0.16}) saturate(${1 - progress * 0.12})`;
          });

        hero
          .querySelectorAll<HTMLElement>("[data-hero-veil]")
          .forEach((element) => {
            element.style.opacity = String(progress * 0.72);
          });
      }
    };

    const requestHeroMotion = () => {
      if (reducedMotion.matches || heroRaf) return;
      heroRaf = window.requestAnimationFrame(updateHeroMotion);
    };

    // ------------------------------------------------------------------
    // 3. Light inertial scrolling on desktop for a softer premium feel.
    //    Native touch scrolling is intentionally untouched.
    // ------------------------------------------------------------------
    let scrollRaf = 0;
    let currentY = window.scrollY;
    let targetY = window.scrollY;

    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const scrollFrame = () => {
      const distance = targetY - currentY;
      currentY += distance * 0.145;

      if (Math.abs(distance) < 0.45) {
        currentY = targetY;
        window.scrollTo(0, currentY);
        scrollRaf = 0;
        return;
      }

      window.scrollTo(0, currentY);
      scrollRaf = window.requestAnimationFrame(scrollFrame);
    };

    const hasScrollableAncestor = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;

      let node: HTMLElement | null = target instanceof HTMLElement
        ? target
        : target.parentElement;

      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const scrollable =
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 2;

        if (scrollable) return true;
        node = node.parentElement;
      }

      return false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (
        reducedMotion.matches ||
        compact.matches ||
        !finePointer.matches ||
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        hasScrollableAncestor(event.target) ||
        document.body.style.overflow === "hidden"
      ) {
        return;
      }

      event.preventDefault();

      const multiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;

      targetY = Math.min(
        maxScroll(),
        Math.max(0, targetY + event.deltaY * multiplier),
      );

      if (!scrollRaf) {
        currentY = window.scrollY;
        scrollRaf = window.requestAnimationFrame(scrollFrame);
      }
    };

    const syncNativeScroll = () => {
      requestHeroMotion();

      if (!scrollRaf) {
        currentY = window.scrollY;
        targetY = window.scrollY;
      }
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

    const handleMotionPreference = () => {
      observe();

      if (reducedMotion.matches) {
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
      } else {
        requestHeroMotion();
      }
    };

    observe();
    requestHeroMotion();

    reducedMotion.addEventListener("change", handleMotionPreference);
    root.addEventListener("focusin", handleFocus);
    window.addEventListener("scroll", syncNativeScroll, { passive: true });
    window.addEventListener("resize", requestHeroMotion, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      observer?.disconnect();
      cancelAnimations();
      if (heroRaf) window.cancelAnimationFrame(heroRaf);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      root.removeEventListener("focusin", handleFocus);
      window.removeEventListener("scroll", syncNativeScroll);
      window.removeEventListener("resize", requestHeroMotion);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
