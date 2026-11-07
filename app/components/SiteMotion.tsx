"use client";

import { useEffect } from "react";
import "../site-motion.css";

/*
 * AUTO 9 — Signature Motion (amélioration progressive).
 * - Titres, kickers et blocs [data-motion-reveal] : fondu + flou qui se dissipe à l'entrée dans l'écran.
 * - Grilles de cartes : cascade colonne par colonne.
 * - Images dans un cadre : dézoom lié au défilement (CSS animation-timeline).
 * - Mot clé émeraude : un reflet le balaie une fois.
 * - [data-motion-count] : le nombre compte jusqu'à sa valeur (le HTML rendu garde la valeur finale).
 * Rien n'est masqué s'il est déjà visible au chargement, et rien ne s'anime si l'utilisateur
 * a demandé moins d'animations. Les éléments qui ont déjà leur propre mouvement sont ignorés.
 */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SKIP = "[data-home-hero], [data-motion-skip], [data-motion-image], form, dialog";

function hasOwnMotion(element: Element) {
  const style = getComputedStyle(element);
  return (
    style.transform !== "none" ||
    style.filter !== "none" ||
    style.position === "absolute" ||
    style.position === "fixed" ||
    style.animationName !== "none"
  );
}

function isChoiceGrid(grid: Element) {
  return Array.from(grid.children).some(
    (child) =>
      child.matches("button, label, input, select, textarea") ||
      child.querySelector("input, select, textarea"),
  );
}

export function SiteMotion() {
  useEffect(() => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-motion-site]"));
    if (!roots.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window) || !("animate" in Element.prototype)) return;

    const compact = window.matchMedia("(max-width: 767px)").matches;
    const viewport = window.innerHeight;
    const pending = new Map<Element, () => void>();
    const animations = new Set<Animation>();
    const counters = new Map<HTMLElement, string>();
    let counterFrame = 0;

    const isVisibleNow = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < viewport * 0.94;
    };

    const shine = (scope: Element, delay: number) => {
      scope.querySelectorAll<HTMLElement>(".bg-accent-word.bg-clip-text").forEach((word) => {
        const animation = word.animate(
          [
            { backgroundPosition: "100% 0, 0 0" },
            { backgroundPosition: "0% 0, 0 0" },
          ],
          { duration: 1700, delay, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
        );
        animations.add(animation);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const run = pending.get(entry.target);
          pending.delete(entry.target);
          run?.();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    const reveal = (element: HTMLElement, kind: "text" | "card", delay = 0) => {
      if (element.closest(SKIP) || element.hasAttribute("data-reveal-pending")) return;
      // Non affiché (ex. bloc réservé au desktop sur mobile) : on n'y touche pas.
      if (!element.getClientRects().length) return;
      if (isVisibleNow(element)) {
        if (kind === "text") shine(element, 700 + delay);
        return;
      }
      if (hasOwnMotion(element)) return;

      element.setAttribute("data-reveal-pending", "");
      const distance = kind === "card" ? (compact ? 18 : 36) : compact ? 14 : 26;
      const blur = compact ? 0 : kind === "card" ? 6 : 10;

      pending.set(element, () => {
        element.removeAttribute("data-reveal-pending");
        const animation = element.animate(
          [
            { opacity: 0, translate: `0 ${distance}px`, filter: `blur(${blur}px)` },
            { opacity: 1, translate: "0 0", filter: "blur(0px)" },
          ],
          {
            duration: kind === "card" ? 1000 : 1150,
            delay,
            easing: EASE,
            fill: "backwards",
          },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
        if (kind === "text") shine(element, delay + 450);
      });
      observer.observe(element);
    };

    for (const root of roots) {
      // Titres de section : kicker, titre puis le paragraphe qui suit, légèrement décalés.
      root.querySelectorAll<HTMLElement>("h2, [data-motion-reveal]").forEach((heading) => {
        const kicker = heading.previousElementSibling as HTMLElement | null;
        const intro = heading.nextElementSibling as HTMLElement | null;
        if (kicker?.matches("p, span")) reveal(kicker, "text", 0);
        reveal(heading, "text", kicker?.matches("p, span") ? 90 : 0);
        if (intro?.matches("p")) reveal(intro, "text", 200);
      });

      // Grilles de cartes : cascade par colonne (pas sur les grilles de choix des formulaires).
      root.querySelectorAll<HTMLElement>('[class*="grid"]').forEach((grid) => {
        if (grid.closest(SKIP) || getComputedStyle(grid).display !== "grid") return;
        const cards = Array.from(grid.children) as HTMLElement[];
        if (cards.length < 2 || cards.length > 16 || isChoiceGrid(grid)) return;
        if (cards.some((card) => card.offsetHeight < 64)) return;
        const firstRowTop = cards[0].offsetTop;
        const columns = Math.max(1, cards.filter((card) => card.offsetTop === firstRowTop).length);
        cards.forEach((card, index) => reveal(card, "card", (index % columns) * 90));
      });

      // Images et vidéos dans un cadre : dézoom au défilement.
      root.querySelectorAll<HTMLElement>("img, video").forEach((media) => {
        if (media.closest(SKIP) || media.closest("[data-hero-media]")) return;
        if (media.offsetWidth < 240 || getComputedStyle(media).transform !== "none") return;
        const frame = media.parentElement;
        if (!frame) return;
        const overflow = getComputedStyle(frame).overflow;
        const frameClips = overflow === "hidden" || overflow === "clip";
        const grandClips = ["hidden", "clip"].includes(
          getComputedStyle(frame.parentElement ?? frame).overflow,
        );
        if (frameClips || grandClips) media.setAttribute("data-motion-media", "");
      });

      // Chiffres clés : comptent jusqu'à leur valeur à l'apparition.
      root.querySelectorAll<HTMLElement>("[data-motion-count]").forEach((counter) => {
        const match = (counter.textContent ?? "").match(/^(\D*)(\d+)([\s\S]*)$/);
        if (!match || !counter.getClientRects().length || isVisibleNow(counter)) return;
        const [, prefix, digits, suffix] = match;
        const target = Number(digits);
        const finalText = counter.textContent ?? "";
        counters.set(counter, finalText);
        counter.textContent = `${prefix}0${suffix}`;
        pending.set(counter, () => {
          const start = performance.now();
          const duration = 1600;
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            counter.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
            if (t < 1) counterFrame = requestAnimationFrame(tick);
            else {
              counter.textContent = finalText;
              counters.delete(counter);
            }
          };
          counterFrame = requestAnimationFrame(tick);
        });
        observer.observe(counter);
      });
    }

    return () => {
      observer.disconnect();
      pending.forEach((_, element) => element.removeAttribute("data-reveal-pending"));
      pending.clear();
      animations.forEach((animation) => animation.cancel());
      counters.forEach((text, counter) => {
        counter.textContent = text;
      });
      if (counterFrame) cancelAnimationFrame(counterFrame);
      document
        .querySelectorAll("[data-motion-media]")
        .forEach((media) => media.removeAttribute("data-motion-media"));
    };
  }, []);

  return null;
}
