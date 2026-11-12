"use client";

import Link from "next/link";
import LinkWaiting from "../crm/components/LinkWaiting";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = { label: string; href: string; icon: ReactNode };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const icons = {
  home: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></svg>,
  folder: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>,
  calendar: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>,
  users: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>,
  euro: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M17 6.5A7 7 0 1 0 17 17.5" /><path d="M4 10h9M4 14h9" /></svg>,
  repeat: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></svg>,
  garage: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M3 21V9l9-5 9 5v12" /><path d="M7 21v-7h10v7M7 17h10" /></svg>,
  target: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>,
  mail: <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>,
};

export const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Pilotage",
    items: [
      { label: "Tableau de bord", href: "/crm-v2", icon: icons.home },
      { label: "Dossiers clients", href: "/crm-v2/pipeline", icon: icons.folder },
      { label: "Calendrier", href: "/crm-v2/calendar", icon: icons.calendar },
      { label: "Clients", href: "/crm-v2/clients", icon: icons.users },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Chiffre d’affaires", href: "/crm-v2/revenue", icon: icons.euro },
      { label: "Abonnements", href: "/crm-v2/subscriptions", icon: icons.repeat },
      { label: "Garages pro", href: "/crm-v2/garages", icon: icons.garage },
      { label: "Développement", href: "/crm-v2/developpement", icon: icons.target },
      { label: "Emails", href: "/crm-v2/emails", icon: icons.mail },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/crm-v2" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function CrmSideNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Menu du CRM" className="grid gap-5">
      {navGroups.map((group) => (
        <div key={group.title} className="grid gap-1">
          <p className="crm-eyebrow px-3 pb-1">{group.title}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="crm-nav-link"
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.icon}
              {item.label}<LinkWaiting />
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function CrmMobileNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Menu du CRM" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {navGroups.flatMap((group) => group.items).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="crm-nav-link shrink-0 whitespace-nowrap !py-2 !text-[12.5px]"
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
        >
          {item.icon}
          {item.label}<LinkWaiting />
        </Link>
      ))}
    </nav>
  );
}
