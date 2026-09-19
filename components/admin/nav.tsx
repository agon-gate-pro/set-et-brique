"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Ticket,
  MapPin,
  CalendarOff,
  Gift,
  BarChart3,
  FileText,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AdminLink = { href: string; label: string; separatorBefore?: boolean };

const icons: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/sets": Package,
  "/admin/reservations": CalendarCheck,
  "/admin/forfaits": Ticket,
  "/admin/lieux": MapPin,
  "/admin/fermetures": CalendarOff,
  "/admin/bons-cadeaux": Gift,
  "/admin/statistiques": BarChart3,
  "/admin/contenus": FileText,
  "/admin/maintenance": Wrench,
};

/**
 * Menu de gestion : colonne sur grand écran, rangée de pastilles défilante sur
 * mobile pour que le contenu de la page arrive tout de suite. La section courante
 * est mise en évidence.
 */
export function AdminNav({ links }: { links: AdminLink[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <aside className="brick-card min-w-0 w-[calc(100%+2.5rem)] md:w-auto p-2 md:p-4 md:sticky md:top-24 -mx-5 md:mx-0 rounded-none md:rounded-2xl border-x-0 md:border-x">
      <h2 className="hidden md:inline-block whitespace-nowrap font-bold text-[15px] text-ink-deep bg-sun rounded-full px-3.5 py-1.5 mb-3">
        Console de gestion
      </h2>
      <nav
        aria-label="Administration"
        className="flex flex-row gap-1 overflow-x-auto max-w-full px-3 md:px-0 md:mt-2 md:flex-col md:gap-1.5 md:overflow-visible [scrollbar-width:none]"
      >
        {links.map((l) => {
          const active = isActive(l.href);
          const Icon = icons[l.href];
          return (
            <span key={l.href} className="contents">
              {l.separatorBefore ? (
                <span className="hidden md:block my-1 border-t border-slate-ink/10" aria-hidden="true" />
              ) : null}
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full md:rounded-md px-3 py-1.5 md:px-2.5 md:py-2 text-sm md:text-base font-bold md:flex md:items-center md:gap-2 ${
                  active ? "bg-ink-deep text-paper" : "text-ink-deep md:font-medium hover:bg-sky"
                }`}
              >
                <Icon className="hidden md:inline-block h-4 w-4 shrink-0" aria-hidden="true" />
                {l.label}
              </Link>
            </span>
          );
        })}
      </nav>
    </aside>
  );
}
