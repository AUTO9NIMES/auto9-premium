import Link from "next/link";
import { ensureCrmV2Access } from "../access";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { loadProspects } from "./data";
import {
  ACTION_LABELS,
  CLOSED_STATUSES,
  EVENT_LABELS,
  PROSPECT_KEY,
  PROSPECT_STATUSES,
  STATUS_LABELS,
  dueFollowUps,
  filterProspects,
  isFollowUpDue,
  isProspectStatus,
  type Prospect,
  type ProspectAction,
  type ProspectHistoryEntry,
  type ProspectStatus,
} from "./prospects";
import {
  createProspect,
  prospectQuickAction,
  setProspectStatus,
  updateProspect,
} from "./actions";
import LocalChecklist from "./LocalChecklist";
import BrowserProspectsMigration from "./BrowserProspectsMigration";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const dayFr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const dateTimeFr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const fmtDay = (iso: string) => dayFr.format(new Date(`${iso}T12:00:00Z`));

/** Jour courant à Paris, lu hors du rendu. */
async function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function statusTone(status: ProspectStatus) {
  if (status === "PARTENAIRE" || status === "RDV_OBTENU" || status === "ESSAI_PREVU") return undefined;
  if (status === "A_RELANCER" || status === "MAIL_ENVOYE") return "warning";
  return "neutral";
}

function hrefWith(base: Params, changes: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    const value = one(v);
    if (value && !["imported", "skipped", "done", "error", "browser", "new"].includes(k)) q.set(k, value);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "") q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return `/crm-v2/developpement${s ? `?${s}` : ""}`;
}

function QuickActions({ p, back }: { p: Prospect; back: string }) {
  if (p.status === "NE_PAS_CONTACTER") return null;
  const actions: ProspectAction[] = ["MAIL_SENT", "CALLED", "FOLLOWED_UP", "STOP"];
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <form key={action} action={prospectQuickAction}>
          <input type="hidden" name="prospectId" value={p.id} />
          <input type="hidden" name="action" value={action} />
          <input type="hidden" name="back" value={back} />
          <button className="crm-btn px-3 py-1.5 text-xs" data-action={action}>
            {ACTION_LABELS[action]}
          </button>
        </form>
      ))}
    </div>
  );
}

function ProspectCard({ p, back, today, openHref }: { p: Prospect; back: string; today: string; openHref: string }) {
  const due = isFollowUpDue(p, today);
  return (
    <article className="crm-glass rounded-[20px] p-4" data-prospect-card={p.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold">{p.name}</h3>
          <p className="crm-muted mt-0.5 truncate text-xs">
            {[p.category, p.city, p.distance_km !== null ? `${p.distance_km} km` : null].filter(Boolean).join(" · ") || "À qualifier"}
          </p>
        </div>
        <span className="crm-chip shrink-0" data-tone={statusTone(p.status)}>{STATUS_LABELS[p.status]}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {p.phone && <a className="crm-accent-text font-semibold" href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
        {p.email && <a className="crm-accent-text font-semibold" href={`mailto:${p.email}`}>{p.email}</a>}
        {p.next_follow_up_on && !CLOSED_STATUSES.includes(p.status) && (
          <span className="crm-chip" data-tone={due ? "warning" : "neutral"} data-due={due ? "1" : undefined}>
            Relance {due && p.next_follow_up_on < today ? "en retard · " : ""}{fmtDay(p.next_follow_up_on)}
          </span>
        )}
        {p.contact_count > 0 && <span className="crm-faint">{p.contact_count} contact{p.contact_count > 1 ? "s" : ""}</span>}
        <Link href={openHref} className="crm-muted ml-auto font-semibold" scroll={false}>Fiche →</Link>
      </div>
      <QuickActions p={p} back={back} />
    </article>
  );
}

function ProspectForm({ p, back, action, submit }: { p?: Prospect; back: string; action: (fd: FormData) => Promise<void>; submit: string }) {
  const field = "crm-field mt-1 block w-full rounded-xl px-3 py-2.5 text-sm";
  const input = (name: keyof Prospect, label: string, type = "text") => (
    <label className="crm-eyebrow block">
      {label}
      <input className={field} name={name} type={type} defaultValue={p ? String(p[name] ?? "") : ""} required={name === "name"} />
    </label>
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {p && <input type="hidden" name="prospectId" value={p.id} />}
      <input type="hidden" name="back" value={back} />
      {input("name", "Nom *")}
      {input("contact_name", "Interlocuteur")}
      {input("phone", "Téléphone", "tel")}
      {input("email", "Email", "email")}
      {input("city", "Commune")}
      {input("category", "Métier")}
      {input("website", "Site")}
      {input("next_follow_up_on", "Prochaine relance", "date")}
      <label className="crm-eyebrow block sm:col-span-2">
        Notes
        <textarea className={field + " min-h-24"} name="notes" defaultValue={p?.notes ?? ""} />
      </label>
      <div className="sm:col-span-2"><button className="crm-btn" data-variant="primary">{submit}</button></div>
    </form>
  );
}

function OpenProspect({ p, events, back, closeHref }: { p: Prospect; events: ProspectHistoryEntry[]; back: string; closeHref: string }) {
  return (
    <section className="crm-glass-strong crm-glass rounded-[24px] p-5 md:p-6" id="fiche" data-open-prospect={p.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="crm-eyebrow">Fiche prospect</p>
          <h2 className="crm-display mt-1 text-3xl">{p.name}</h2>
          <p className="crm-muted mt-1 text-sm">
            {[p.legal_name && p.legal_name.toLowerCase() !== p.name.toLowerCase() ? p.legal_name : null, p.address, p.headcount ? `${p.headcount} salariés` : null, p.siret ? `SIRET ${p.siret}` : null].filter(Boolean).join(" · ") || "Ajouté à la main"}
          </p>
          {p.source_notes && <p className="crm-faint mt-1 text-xs">Recherche : {p.source_notes}</p>}
        </div>
        <Link href={closeHref} className="crm-btn" scroll={false}>Fermer ×</Link>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <form action={setProspectStatus} className="flex items-end gap-2">
          <input type="hidden" name="prospectId" value={p.id} />
          <input type="hidden" name="back" value={back} />
          <label className="crm-eyebrow block">
            Statut
            <select name="status" defaultValue={p.status} className="crm-field mt-1 block rounded-xl px-3 py-2.5 text-sm">
              {PROSPECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <button className="crm-btn">Changer</button>
        </form>
        <QuickActions p={p} back={back} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
        <ProspectForm p={p} back={back} action={updateProspect} submit="Enregistrer la fiche" />
        <div>
          <p className="crm-eyebrow">Historique</p>
          <ol className="mt-2 grid gap-2" data-prospect-history>
            {events.length === 0 && <li className="crm-muted text-sm">Aucune action pour l’instant.</li>}
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-semibold">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>
                {e.to_status && e.from_status !== e.to_status && <span className="crm-muted"> → {STATUS_LABELS[e.to_status]}</span>}
                <span className="crm-faint block text-xs">{dateTimeFr.format(new Date(e.created_at))}{e.note ? ` · ${e.note}` : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const ERRORS: Record<string, string> = {
  import_format: "Reprise impossible : données du navigateur illisibles.",
  duplicate: "Ce prospect existe déjà dans la liste.",
  invalid: "Données invalides.",
  not_found: "Prospect introuvable.",
  unavailable: "Enregistrement impossible pour le moment. Réessayez.",
};
const DONE: Record<string, string> = {
  MAIL_SENT: "Mail noté : relance programmée dans 7 jours.",
  CALLED: "Appel noté : relance programmée dans 7 jours.",
  FOLLOWED_UP: "Relance notée : prochaine relance dans 7 jours.",
  STOP: "Noté : ce prospect ne sera plus contacté.",
  STATUS: "Statut mis à jour.",
  EDITED: "Fiche enregistrée.",
  CREATED: "Prospect ajouté.",
};

export default async function DevelopmentPage({ searchParams }: { searchParams: Promise<Params> }) {
  await ensureCrmV2Access("/crm-v2/developpement");

  const sp = await searchParams;
  const tab = ["todo", "prospects", "checklist"].includes(one(sp.tab)) ? one(sp.tab) : "todo";
  const statusParam = one(sp.status);
  const status = isProspectStatus(statusParam) ? statusParam : undefined;
  const category = one(sp.category).slice(0, 80);
  const city = one(sp.city).slice(0, 120);
  const q = one(sp.q).slice(0, 80);
  const openId = PROSPECT_KEY.test(one(sp.open)) ? one(sp.open) : "";
  const showNew = one(sp.new) === "1";
  const back = hrefWith(sp, {});
  const today = await parisToday();

  const { businessId } = await resolveCurrentBusinessContext();
  let unavailable = false;
  let all: Prospect[] = [];
  try {
    all = await loadProspects(businessId);
  } catch (error) {
    console.error("CRM prospects unavailable", error);
    unavailable = true;
  }
  const facets = all;
  const due = dueFollowUps(all, today);
  const toContact = all.filter((p) => p.status === "A_CONTACTER").slice(0, 10);
  const list = filterProspects(all, { status, category, city, q });
  const opened = openId ? all.find((p) => p.id === openId) ?? null : null;
  const events = opened?.history ?? [];

  const count = (s: ProspectStatus[]) => facets.filter((f) => s.includes(f.status)).length;
  const categories = [...new Set(facets.map((f) => f.category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  const cities = [...new Set(facets.map((f) => f.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  const kpis = [
    { key: "due", label: "À relancer aujourd’hui", value: due.length, href: hrefWith(sp, { tab: "todo" }) },
    { key: "to_contact", label: "À contacter", value: count(["A_CONTACTER"]), href: hrefWith(sp, { tab: "prospects", status: "A_CONTACTER" }) },
    { key: "active", label: "En cours", value: count(["MAIL_ENVOYE", "A_RELANCER", "RDV_OBTENU", "ESSAI_PREVU"]), href: hrefWith(sp, { tab: "prospects", status: null }) },
    { key: "partners", label: "Partenaires", value: count(["PARTENAIRE"]), href: hrefWith(sp, { tab: "prospects", status: "PARTENAIRE" }) },
  ];
  const openHref = (id: string) => hrefWith(sp, { open: id }) + "#fiche";
  const imported = one(sp.imported);
  const error = ERRORS[one(sp.error)];
  const done = DONE[one(sp.done)];

  return (
    <div className="space-y-6" data-development-page>
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="crm-eyebrow">Prospection</p>
          <h1 className="crm-display mt-1 text-4xl md:text-5xl">Développement</h1>
          <p className="crm-muted mt-2 text-sm">
            {facets.length} prospect{facets.length > 1 ? "s" : ""} · {due.length} relance{due.length > 1 ? "s" : ""} à faire aujourd’hui
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={hrefWith(sp, { new: "1" })} className="crm-btn" data-variant="primary">+ Nouveau prospect</Link>
        </div>
      </header>

      {unavailable && (
        <p className="crm-chip" data-tone="warning" data-prospects-unavailable>
          Prospection momentanément indisponible : le journal d’activité n’a pas pu être lu. Réessayez dans un instant.
        </p>
      )}
      {imported && (
        <p className="crm-chip" data-import-result>
          {imported} prospect{Number(imported) > 1 ? "s" : ""} ajouté{Number(imported) > 1 ? "s" : ""}
          {one(sp.skipped) && Number(one(sp.skipped)) > 0 ? ` · ${one(sp.skipped)} déjà présent${Number(one(sp.skipped)) > 1 ? "s" : ""} ou ignoré${Number(one(sp.skipped)) > 1 ? "s" : ""}` : ""}
        </p>
      )}
      {done && <p className="crm-chip">{done}</p>}
      {error && <p className="crm-chip" data-tone="warning">{error}</p>}

      {!unavailable && <BrowserProspectsMigration back={back} />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.key} href={k.href} className="crm-glass crm-lift rounded-[20px] p-4" data-kpi={k.key}>
            <p className="crm-eyebrow">{k.label}</p>
            <p className="crm-display crm-num mt-2 text-3xl">{k.value}</p>
          </Link>
        ))}
      </section>

      {showNew && (
        <section className="crm-glass rounded-[24px] p-5 md:p-6" data-new-prospect>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="crm-display text-2xl">Nouveau prospect</h2>
            <Link href={hrefWith(sp, { new: null })} className="crm-btn">Fermer ×</Link>
          </div>
          <ProspectForm back={back} action={createProspect} submit="Ajouter le prospect" />
        </section>
      )}

      {opened && <OpenProspect p={opened} events={events} back={back} closeHref={hrefWith(sp, { open: null })} />}

      <nav className="flex flex-wrap gap-2" aria-label="Onglets">
        {[["todo", `À faire${due.length ? ` · ${due.length}` : ""}`], ["prospects", "Prospects"], ["checklist", "Checklist"]].map(([key, label]) => (
          <Link key={key} href={hrefWith(sp, { tab: key })} className="crm-btn" data-variant={tab === key ? "primary" : undefined} aria-current={tab === key ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "todo" && (
        <div className="grid gap-6" data-tab="todo">
          <section>
            <h2 className="crm-display text-2xl">Relances du jour</h2>
            <p className="crm-muted mt-1 text-sm">Relances arrivées à échéance, de la plus ancienne à la plus récente.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2" data-due-list>
              {due.length === 0 && <p className="crm-glass rounded-[20px] p-5 text-sm">Aucune relance à faire aujourd’hui 🎉</p>}
              {due.map((p) => <ProspectCard key={p.id} p={p} back={back} today={today} openHref={openHref(p.id)} />)}
            </div>
          </section>
          <section>
            <h2 className="crm-display text-2xl">Prochains à contacter</h2>
            <p className="crm-muted mt-1 text-sm">Les prospects prioritaires jamais contactés.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2" data-to-contact-list>
              {toContact.length === 0 && <p className="crm-glass rounded-[20px] p-5 text-sm">Tous vos prospects ont été contactés 👏</p>}
              {toContact.map((p) => <ProspectCard key={p.id} p={p} back={back} today={today} openHref={openHref(p.id)} />)}
            </div>
          </section>
        </div>
      )}

      {tab === "prospects" && (
        <section className="grid gap-4" data-tab="prospects">
          <form method="get" action="/crm-v2/developpement" className="crm-glass grid gap-2 rounded-[20px] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
            <input type="hidden" name="tab" value="prospects" />
            <input name="q" defaultValue={q} placeholder="Rechercher un nom, une commune, un téléphone…" className="crm-field rounded-xl px-3 py-2.5 text-sm" aria-label="Rechercher" />
            <select name="status" defaultValue={status ?? ""} className="crm-field rounded-xl px-3 py-2.5 text-sm" aria-label="Statut">
              <option value="">Tous les statuts</option>
              {PROSPECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]} ({count([s])})</option>)}
            </select>
            <select name="category" defaultValue={category} className="crm-field rounded-xl px-3 py-2.5 text-sm" aria-label="Métier">
              <option value="">Tous les métiers</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="city" defaultValue={city} className="crm-field rounded-xl px-3 py-2.5 text-sm" aria-label="Commune">
              <option value="">Toutes les communes</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="crm-btn" data-variant="primary">Filtrer</button>
          </form>
          <div className="grid gap-3 md:grid-cols-2" data-prospect-list>
            {list.length === 0 && <p className="crm-glass rounded-[20px] p-5 text-sm">Aucun prospect pour ces filtres.</p>}
            {list.map((p) => <ProspectCard key={p.id} p={p} back={back} today={today} openHref={openHref(p.id)} />)}
          </div>
          <p className="crm-muted text-xs">{list.length} prospect{list.length > 1 ? "s" : ""} affiché{list.length > 1 ? "s" : ""}</p>
        </section>
      )}

      {tab === "checklist" && <LocalChecklist />}

    </div>
  );
}
