#!/usr/bin/env node
/*
 * Génère app/crm-v2/crm-v2-light-adapter.css
 *
 * Couche de transition du thème clair « Porcelaine émeraude » du CRM V2 :
 * les pages encore codées en sombre (text-white/45, bg-[#081019], cyan…)
 * sont converties vers les couleurs du thème clair, sans toucher à leur code.
 * Chaque page redessinée n'a plus besoin de cette couche ; quand toutes le
 * seront, ce fichier et ce script peuvent être supprimés.
 *
 * Usage : node scripts/generate-crm-v2-light-adapter.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourceDir = path.join(root, "app/crm-v2");
const outFile = path.join(sourceDir, "crm-v2-light-adapter.css");
const SCOPE = ".crm-v2-root.crm-skin-light";

const breakpoints = { sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem" };
const pseudoVariants = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  disabled: ":disabled",
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

// Échappement CSS d'un nom de classe Tailwind (/, [, ], #, ., :, (, ), %, virgule…).
const escapeClass = (value) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);

function opacityOf(token) {
  const match = token.match(/\/(\[([0-9.]+)\]|([0-9.]+))$/);
  if (!match) return 1;
  const raw = match[2] ?? match[3];
  const value = Number(raw);
  return match[2] !== undefined ? value : value / 100;
}

function hexLuminance(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const family = (name) =>
  /^(cyan|sky|teal)$/.test(name) ? "accent" :
  /^(emerald|green|lime)$/.test(name) ? "success" :
  /^(amber|yellow|orange)$/.test(name) ? "warning" :
  /^(red|rose)$/.test(name) ? "danger" :
  /^(blue|violet|indigo)$/.test(name) ? "accent" :
  /^(slate|zinc|gray|neutral|stone)$/.test(name) ? "neutral" : null;

/* Déclarations pour une classe de base (sans variante). null = laisser telle quelle. */
function declarationsFor(base) {
  let m;

  // ---------- Texte ----------
  if ((m = base.match(/^text-white(\/.+)?$/))) {
    const o = opacityOf(base);
    const color = o >= 0.75 ? "var(--crm-ink)" : o >= 0.55 ? "var(--crm-ink-2)" : o >= 0.35 ? "var(--crm-muted)" : "var(--crm-faint)";
    return `color: ${color};`;
  }
  if ((m = base.match(/^text-(cyan|sky|teal|emerald|green|lime|amber|yellow|orange|red|rose|blue|violet|indigo|slate|zinc|gray)-\d{2,3}(\/.+)?$/))) {
    const f = family(m[1]);
    return `color: ${{ accent: "var(--crm-accent-text)", success: "var(--crm-accent-text)", warning: "var(--crm-warning-text)", danger: "var(--crm-danger-text)", neutral: "var(--crm-muted)" }[f]};`;
  }
  // « text-[rgb(165 243 252)] » écrit avec des espaces : Tailwind n'en garde que « text-[rgb(165 ».
  if (/^text-\[rgb\(165(_243_252|$)/.test(base)) return "color: var(--crm-accent-text);";
  // Textes sombres (boutons clairs, aperçu blanc des e-mails) : laissés tels quels.
  if (/^text-\[#[0-9a-fA-F]{3,8}\]$/.test(base)) return null;
  if (/^text-black(\/.+)?$/.test(base)) return null;

  // ---------- Fonds ----------
  if ((m = base.match(/^bg-white(\/.+)?$/))) {
    if (!m[1]) return null; // bouton blanc plein : reste blanc
    const o = opacityOf(base);
    return `background-color: ${o <= 0.03 ? "var(--crm-glass-soft)" : o <= 0.08 ? "var(--crm-glass)" : "var(--crm-glass-strong)"};`;
  }
  if (/^bg-black(\/.+)?$/.test(base)) return "background-color: var(--crm-glass-soft);";
  if ((m = base.match(/^bg-\[#([0-9a-fA-F]{3,8})\](\/.+)?$/))) {
    if (hexLuminance(m[1]) > 0.6) return null;
    return `background-color: ${opacityOf(base) >= 0.9 ? "var(--crm-surface)" : "var(--crm-glass)"}; -webkit-backdrop-filter: blur(18px) saturate(140%); backdrop-filter: blur(18px) saturate(140%); box-shadow: var(--crm-shadow);`;
  }
  if ((m = base.match(/^bg-(cyan|sky|teal|emerald|green|lime|amber|yellow|orange|red|rose|blue|violet|indigo|slate|zinc|gray)-\d{2,3}(\/.+)?$/))) {
    const f = family(m[1]);
    const solid = !m[2];
    if (solid) {
      return `background-color: ${{ accent: "var(--crm-accent)", success: "var(--crm-accent)", warning: "var(--crm-warning)", danger: "var(--crm-danger)", neutral: "var(--crm-muted)" }[f]};`;
    }
    const o = Math.min(1, Math.max(0.08, opacityOf(base) * 2.2));
    const rgb = { accent: "var(--crm-accent-rgb)", success: "var(--crm-accent-rgb)", warning: "var(--crm-warning-rgb)", danger: "var(--crm-danger-rgb)", neutral: "var(--crm-ink-rgb)" }[f];
    return `background-color: rgba(${rgb}, ${o.toFixed(3)});`;
  }
  if (/^bg-\[rgb\(165(_243_252|$)/.test(base)) return "background-color: rgba(var(--crm-accent-rgb), 0.14);";

  // ---------- Bordures ----------
  if ((m = base.match(/^border-white(\/.+)?$/))) {
    return `border-color: ${opacityOf(base) >= 0.15 ? "var(--crm-line-strong)" : "var(--crm-line)"};`;
  }
  if ((m = base.match(/^(border|divide|ring|outline)-(cyan|sky|teal|emerald|green|lime|amber|yellow|orange|red|rose|blue|violet|indigo|slate|zinc|gray)-\d{2,3}(\/.+)?$/))) {
    const f = family(m[2]);
    const rgb = { accent: "var(--crm-accent-rgb)", success: "var(--crm-accent-rgb)", warning: "var(--crm-warning-rgb)", danger: "var(--crm-danger-rgb)", neutral: "var(--crm-ink-rgb)" }[f];
    const o = Math.max(0.3, Math.min(0.7, opacityOf(base) * 1.8));
    const prop = m[1] === "ring" ? "--tw-ring-color" : m[1] === "outline" ? "outline-color" : "border-color";
    return `${prop}: rgba(${rgb}, ${o.toFixed(3)});`;
  }
  if (/^border-\[rgb\(165(_243_252|$)/.test(base)) return "border-color: rgba(var(--crm-accent-rgb), 0.3);";
  if ((m = base.match(/^divide-white(\/.+)?$/))) return "border-color: var(--crm-line);";

  // ---------- Dégradés ----------
  if ((m = base.match(/^(from|via|to)-(cyan|sky|teal|emerald|green|blue|violet|indigo)-\d{2,3}(\/.+)?$/))) {
    const o = Math.min(0.22, opacityOf(base) * 1.4);
    return `--tw-gradient-${m[1]}: rgba(var(--crm-accent-rgb), ${o.toFixed(3)});`;
  }
  if ((m = base.match(/^(from|via|to)-(\[#[0-9a-fA-F]+\]|black)(\/.+)?$/))) {
    return `--tw-gradient-${m[1]}: rgba(255, 255, 255, ${m[1] === "to" ? "0" : "0.55"});`;
  }

  // ---------- Placeholders ----------
  if ((m = base.match(/^placeholder-white(\/.+)?$/))) return "color: var(--crm-faint);";

  return null;
}

function ruleFor(token) {
  const parts = token.split(":");
  const base = parts.pop();
  let decl;
  let selectorSuffix = "";
  let groupPrefix = "";
  let media = null;
  let pseudoElement = "";

  if (base.startsWith("placeholder")) return null;
  for (const variant of parts) {
    if (breakpoints[variant]) media = breakpoints[variant];
    else if (pseudoVariants[variant]) selectorSuffix += pseudoVariants[variant];
    else if (variant === "group-hover") groupPrefix = ".group:hover ";
    else if (variant === "placeholder") pseudoElement = "::placeholder";
    else return null; // variante non gérée (arbitraire…) : on ne touche pas
  }

  const placeholderBase = pseudoElement && base.match(/^text-white(\/.+)?$/);
  decl = placeholderBase ? "color: var(--crm-faint);" : declarationsFor(base);
  if (!decl) return null;

  const isDivide = base.startsWith("divide-");
  const selector = `${SCOPE} ${groupPrefix}.${escapeClass(token)}${selectorSuffix}${isDivide ? " > :not(:last-child)" : ""}${pseudoElement}`;
  const rule = `${selector} { ${decl} }`;
  return media ? `@media (min-width: ${media}) { ${rule} }` : rule;
}

const tokens = new Set();
for (const file of walk(sourceDir)) {
  const source = fs.readFileSync(file, "utf8");
  for (const token of source.match(/[!a-z0-9:_-]*(?:text|bg|border|divide|ring|outline|from|via|to|placeholder)-[^\s"'`{}]+/g) ?? []) {
    tokens.add(token.replace(/^!/, ""));
  }
}

const rules = [...tokens].sort().map(ruleFor).filter(Boolean);

const header = `/*
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 * Source : scripts/generate-crm-v2-light-adapter.mjs (${rules.length} règles).
 * Couche de transition : convertit les pages du CRM V2 encore codées en sombre
 * vers le thème clair « Porcelaine émeraude ». À supprimer quand toutes les
 * pages auront leur design clair natif.
 */
`;
fs.writeFileSync(outFile, header + rules.join("\n") + "\n");
console.log(`${rules.length} règles écrites dans ${path.relative(root, outFile)} (${tokens.size} classes candidates).`);
