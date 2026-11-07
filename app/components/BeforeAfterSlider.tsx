"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type Shot = { src: string; alt: string; label: string };

/*
 * Curseur avant/après : on fait glisser la séparation (doigt, souris ou clavier).
 * Le défilement vertical reste libre sur mobile (touch-action: pan-y).
 * À la première apparition, la poignée fait un aller-retour discret pour montrer le geste.
 */
export function BeforeAfterSlider({ before, after }: { before: Shot; after: Shot }) {
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState(50);
  const [hinting, setHinting] = useState(false);

  const moveTo = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  useEffect(() => {
    const element = frame.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    let timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setHinting(true);
        const steps: [number, number][] = [[350, 34], [1250, 64], [2150, 50]];
        timers = steps.map(([delay, value]) => window.setTimeout(() => setPosition(value), delay));
        timers.push(window.setTimeout(() => setHinting(false), 3100));
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setHinting(false);
    if (event.pointerType === "touch") {
      // Au doigt : on attend de savoir si le geste est horizontal (glisser) ou vertical (défiler la page).
      touchStart.current = { x: event.clientX, y: event.clientY };
      return;
    }
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    if (!dragging.current && start) {
      const dx = Math.abs(event.clientX - start.x);
      const dy = Math.abs(event.clientY - start.y);
      if (dx > 8 && dx > dy) {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (dy > 8) {
        touchStart.current = null; // défilement vertical : on laisse faire le navigateur
      }
    }
    if (dragging.current) moveTo(event.clientX);
  };
  const stop = () => {
    dragging.current = false;
    touchStart.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const next =
      event.key === "ArrowLeft" ? position - step
      : event.key === "ArrowRight" ? position + step
      : event.key === "Home" ? 0
      : event.key === "End" ? 100
      : null;
    if (next === null) return;
    event.preventDefault();
    setHinting(false);
    setPosition(Math.min(100, Math.max(0, next)));
  };

  const ease = hinting ? "transition-all duration-[850ms] ease-[cubic-bezier(0.65,0,0.35,1)]" : "";

  return (
    <div
      ref={frame}
      role="slider"
      tabIndex={0}
      aria-label="Comparer avant et après : glisser pour révéler"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)} % avant`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      className="group relative mx-auto aspect-[4/5] w-full max-w-4xl cursor-ew-resize select-none overflow-hidden rounded-[28px] border border-white/12 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,.45)] outline-none [touch-action:pan-y] focus-visible:ring-2 focus-visible:ring-accent sm:aspect-[4/3]"
    >
      {/* Après : image complète en dessous */}
      <img src={after.src} alt={after.alt} loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover" />

      {/* Avant : même cadrage, découpé jusqu'à la poignée */}
      <img
        src={before.src}
        alt={before.alt}
        loading="lazy"
        draggable={false}
        className={`absolute inset-0 h-full w-full object-cover ${ease}`}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <span className="pointer-events-none absolute left-5 top-5 z-10 rounded-full border border-white/12 bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/70 backdrop-blur-md">
        {before.label}
      </span>
      <span className="pointer-events-none absolute right-5 top-5 z-10 rounded-full border border-accent-soft/30 bg-forest/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-ivory backdrop-blur-md">
        {after.label}
      </span>

      {/* Séparation + poignée */}
      <div className={`pointer-events-none absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-white/80 shadow-[0_0_18px_rgba(255,255,255,.55)] ${ease}`} style={{ left: `${position}%` }}>
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-metal text-on-metal shadow-[0_10px_30px_rgba(0,0,0,.45)] transition-transform duration-300 group-active:scale-95">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M9 6 3 12l6 6M15 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
