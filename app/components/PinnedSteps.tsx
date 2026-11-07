"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./PinnedSteps.module.css";

type Step = { number: string; title: string; text: string };

/*
 * Section « Trois étapes » façon Apple : sur grand écran, elle reste épinglée pendant le défilement
 * et les étapes se succèdent, avec une jauge émeraude. Sur mobile, tablette ou si l'utilisateur
 * demande moins d'animations : liste classique (le CSS décide, le texte n'est jamais dupliqué).
 */
export function PinnedSteps({ steps, heading }: { steps: Step[]; heading: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return; // mise en page non épinglée
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(p);
      setActive(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [steps.length]);

  const goTo = (index: number) => {
    const element = track.current;
    if (!element) return;
    const travel = element.offsetHeight - window.innerHeight;
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + travel * ((index + 0.5) / steps.length), behavior: "smooth" });
  };

  return (
    <div ref={track} className={styles.track}>
      <div className={styles.stage}>
        <div>
          {heading}

          {/* Jauge de progression (grand écran épinglé uniquement) */}
          <div className={styles.gauge} aria-hidden="true">
            <div className="relative w-px bg-white/12">
              <div
                className="absolute inset-x-0 top-0 bg-accent shadow-[0_0_14px_rgba(var(--accent-rgb),.7)]"
                style={{ height: `${progress * 100}%` }}
              />
            </div>
            <div className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <button
                  key={step.number}
                  type="button"
                  tabIndex={-1}
                  onClick={() => goTo(index)}
                  className={`text-left text-xs font-black tracking-[0.3em] transition-colors duration-500 ${
                    index === active ? "text-accent" : index < active ? "text-white/45" : "text-white/25"
                  }`}
                >
                  {step.number}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.deck}>
          {steps.map((step, index) => (
            <article
              key={step.number}
              data-state={index === active ? "active" : index < active ? "past" : "future"}
              className={`${styles.card} overflow-hidden rounded-[28px] border bg-white/[0.035] p-7 shadow-[0_22px_60px_rgba(0,0,0,.35)] backdrop-blur-xl transition-colors duration-700 lg:p-10 ${
                index === active ? "border-accent-soft/30" : "border-white/10"
              }`}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/10 blur-[70px]" />
              <p className="relative bg-price bg-clip-text text-5xl font-black tracking-[-0.06em] text-transparent lg:text-7xl">
                {step.number}
              </p>
              <h3 className="relative mt-6 text-2xl font-black uppercase tracking-[-0.04em] lg:text-4xl">{step.title}</h3>
              <p className="relative mt-4 max-w-md text-sm leading-7 text-white/60 lg:text-base lg:leading-8">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
