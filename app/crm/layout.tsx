import type { Metadata } from "next";

import { requireCrmAccess } from "../lib/auth/dal";
import { canAccessAutomation } from "../lib/auth/roles";

export const metadata: Metadata = {
  title: "CRM AUTO9",
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/crm", label: "Dashboard", detail: "Vue d'ensemble" },
  { href: "/crm/clients", label: "Clients", detail: "Base relationnelle" },
  { href: "/crm/pipeline", label: "Pipeline", detail: "Suivi commercial" },
  { href: "/crm/jobs", label: "Prestations", detail: "Opérations en cours" },
  { href: "/crm/calendar", label: "Calendrier", detail: "Planning mensuel" },
  { href: "/crm/automation", label: "Automatisations", detail: "Santé des événements" },
];

async function CrmNavigation() {
  let showAutomation = false;

  try {
    const access = await requireCrmAccess();
    showAutomation = canAccessAutomation(access.role);
  } catch {
    // Login and denied-access routes must remain renderable.
  }

  const visibleNavigation = navigation.filter(
    (item) => item.href !== "/crm/automation" || showAutomation,
  );

  return (
    <nav aria-label="Navigation CRM" className="flex gap-2 overflow-x-auto px-4 pb-4 md:block md:flex-1 md:space-y-2 md:px-4 md:pb-0">
      {visibleNavigation.map((item, index) => (
        <a key={item.href} href={item.href} className="flex min-w-max items-center gap-3 rounded-sm border border-transparent px-3 py-3 text-white/55 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white md:min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-[10px] font-medium text-white/45">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="hidden text-[10px] text-white/35 md:block">{item.detail}</span>
          </span>
        </a>
      ))}
    </nav>
  );
}

export default function CrmLayout({ children }: {
  children: React.ReactNode;
}) {
  return (
    <div className="crm-shell min-h-screen bg-[#080a0d] text-[#f4f1ea] selection:bg-[#d8b477] selection:text-[#080a0d]">
      <style>{`
        .crm-shell:has([data-crm-route="dashboard"]) a[href="/crm"],
        .crm-shell:has([data-crm-route="clients"]) a[href="/crm/clients"],
        .crm-shell:has([data-crm-route="pipeline"]) a[href="/crm/pipeline"],
        .crm-shell:has([data-crm-route="jobs"]) a[href="/crm/jobs"],
        .crm-shell:has([data-crm-route="calendar"]) a[href="/crm/calendar"],
        .crm-shell:has([data-crm-route="automation"]) a[href="/crm/automation"] {
          background: #d8b477;
          color: #080a0d;
        }
      `}</style>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-white/10 bg-[#0d1014] md:flex md:min-h-screen md:w-72 md:flex-col md:border-r md:border-b-0">
          <div className="flex items-center justify-between px-5 py-5 md:block md:px-7 md:py-8">
            <a href="/crm" className="inline-flex items-center gap-3" aria-label="AUTO9 CRM, dashboard">
              <span className="flex h-10 w-10 items-center justify-center border border-[#d8b477] text-sm font-semibold tracking-[0.2em] text-[#d8b477]">A9</span>
              <span>
                <span className="block text-sm font-semibold tracking-[0.28em] text-white">AUTO9</span>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-white/40">Back-office</span>
              </span>
            </a>
            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/30 md:block md:pt-12">Espace interne</span>
          </div>

          <CrmNavigation />

          <div className="hidden border-t border-white/10 p-5 md:block md:p-7">
            <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Session sécurisée
            </div>
            <form action="/logout" method="post">
              <button type="submit" className="w-full border border-white/10 px-3 py-2.5 text-left text-xs text-white/60 transition-colors hover:border-[#d8b477]/60 hover:text-[#d8b477]">
                Se déconnecter <span className="float-right text-white/30">→</span>
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-10 md:py-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#d8b477]">AUTO9 / CRM</p>
              <p className="mt-1 text-xs text-white/35">Pilotage interne</p>
            </div>
            <span className="border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/35">V1.0</span>
          </header>
          <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
