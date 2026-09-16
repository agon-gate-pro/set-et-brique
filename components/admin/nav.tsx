"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminLink = { href: string; label: string };

/**
 * Menu de gestion : colonne sur grand écran, rangée de pastilles défilante sur
 * mobile pour que le contenu de la page arrive tout de suite. La section courante
 * est mise en évidence.
 */
export function AdminNav({ links, role }: { links: AdminLink[]; role: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <aside className="brick-card min-w-0 w-[calc(100%+2.5rem)] md:w-auto p-2 md:p-4 md:sticky md:top-24 -mx-5 md:mx-0 rounded-none md:rounded-2xl border-x-0 md:border-x">
      <p className="hidden md:block display font-semibold text-brick-deep px-2">
        Gestion · {role === "superadmin" ? "superadmin" : "gérant"}
      </p>
      <nav
        aria-label="Administration"
        className="flex flex-row gap-1 overflow-x-auto max-w-full px-3 md:px-0 md:mt-2 md:flex-col md:overflow-visible [scrollbar-width:none]"
      >
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-full md:rounded-md px-3 py-1.5 md:px-2 md:py-2 text-sm md:text-base font-bold ${
                active ? "bg-ink-deep text-paper md:bg-sky md:text-brick-deep" : "text-ink-deep hover:bg-sky"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
