"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ZoneMap.module.css";

/*
 * Zone d'intervention : Nîmes au centre, cercles à 10 / 20 / 30 km.
 * Positions réelles (coordonnées GPS projetées, 5 unités = 1 km), toutes les communes à moins de 30 km.
 */
const communes = [
  { name: "Caissargues", x: 207.6, y: 223.2, km: 4.9 },
  { name: "Milhaud", x: 179.9, y: 226.5, km: 6.7 },
  { name: "Bouillargues", x: 226.9, y: 221.5, km: 6.9 },
  { name: "Marguerittes", x: 233.3, y: 187.0, km: 7.1 },
  { name: "Vauvert", x: 166.2, y: 279.3, km: 17.2, label: true },
  { name: "Saint-Gilles", x: 228.9, y: 288.2, km: 18.6, label: true },
  { name: "Remoulins", x: 280.7, y: 142.6, km: 19.8, label: true },
  { name: "Uzès", x: 224.0, y: 102.5, km: 20.1, label: true },
  { name: "Sommières", x: 91.6, y: 229.3, km: 22.5, label: true },
  { name: "Beaucaire", x: 314.0, y: 216.0, km: 23.0, label: true },
  { name: "Lunel", x: 110.0, y: 289.3, km: 25.4, label: true },
];

export function ZoneMap() {
  const ref = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="zone" className="relative scroll-mt-24 px-5 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-x-14 lg:gap-y-8">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="text-[11px] font-black uppercase tracking-[0.45em] text-accent sm:text-xs">Zone d’intervention</p>
          <h2 data-motion-reveal className="mt-5 text-[40px] font-black uppercase leading-[0.96] tracking-[-0.055em] sm:text-[54px] lg:text-[64px]">
            On vient jusqu’à{" "}
            <span className="bg-accent-word bg-clip-text text-transparent">vous.</span>
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-white/55">
            Nîmes et jusqu’à 30 km autour, à domicile ou sur votre lieu de travail.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[720px] rounded-[2rem] border border-white/10 bg-[rgba(10,11,11,.62)] p-1.5 sm:p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 shadow-[0_30px_90px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl sm:p-6">
          <svg
            ref={ref}
            viewBox="38 38 324 324"
            className={styles.map}
            data-in-view={inView ? "" : undefined}
            role="img"
            aria-label="Carte : Nîmes et les communes jusqu’à 30 km autour"
          >
            <defs>
              <radialGradient id="zone-disc" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgb(52,192,133)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="rgb(52,192,133)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="zone-sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(111,217,168)" stopOpacity="0" />
                <stop offset="100%" stopColor="rgb(111,217,168)" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            <circle cx="200" cy="200" r="150" fill="url(#zone-disc)" />

            {/* balayage radar */}
            <g className={styles.sweep}>
              <path d="M200 200 L350 200 A150 150 0 0 0 306.07 93.93 Z" fill="url(#zone-sweep)" />
            </g>

            {/* cercles 10 / 20 / 30 km */}
            {[50, 100, 150].map((r, index) => (
              <g key={r}>
                <circle
                  className={styles.ring}
                  style={{ "--delay": `${index * 180}ms` } as React.CSSProperties}
                  cx="200"
                  cy="200"
                  r={r}
                  fill="none"
                  stroke={r === 150 ? "rgba(52,192,133,.55)" : "rgba(255,255,255,.1)"}
                  strokeWidth={r === 150 ? 1.4 : 1}
                  strokeDasharray={r === 150 ? "4 6" : undefined}
                />
                <text x={200 - r * 0.71 - 3} y={200 - r * 0.71 - 3} textAnchor="end" fill="rgba(255,255,255,.35)" fontSize="9" fontWeight="700" letterSpacing="1">
                  {r / 5} km
                </text>
              </g>
            ))}

            {/* communes, de la plus proche à la plus éloignée */}
            {communes.map((commune) => (
              <g key={commune.name}>
                <circle
                  className={styles.dot}
                  style={{ "--delay": `${500 + commune.km * 45}ms` } as React.CSSProperties}
                  cx={commune.x}
                  cy={commune.y}
                  r="3.6"
                  fill="#dfe3e5"
                />
                {commune.label && (
                  <text
                    className={styles.label}
                    style={{ "--delay": `${560 + commune.km * 45}ms` } as React.CSSProperties}
                    x={commune.x}
                    y={commune.y - 9}
                    textAnchor="middle"
                    fill="rgba(236,232,224,.78)"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {commune.name}
                  </text>
                )}
              </g>
            ))}

            {/* Nîmes */}
            <circle className={styles.pulse} cx="200" cy="200" r="7" fill="rgb(52,192,133)" />
            <circle cx="200" cy="200" r="7" fill="rgb(52,192,133)" stroke="#0a120e" strokeWidth="2" />
            <text x="200" y="184" textAnchor="middle" fill="#ece8e0" fontSize="14" fontWeight="900" letterSpacing="2">
              NÎMES
            </text>
          </svg>
        </div>
        <ul className="flex flex-wrap gap-2 lg:col-start-1 lg:row-start-2 lg:self-start" aria-label="Exemples de communes dans la zone">
          {communes.map((commune) => (
            <li key={commune.name} className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-bold text-white/65">
              {commune.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
