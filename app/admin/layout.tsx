import Link from "next/link";
import { requireRole } from "@/lib/auth";

const sections = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/sets", label: "Sets" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/forfaits", label: "Forfaits" },
  { href: "/admin/lieux", label: "Lieux de remise" },
  { href: "/admin/fermetures", label: "Périodes fermées" },
  { href: "/admin/contenus", label: "Contenus du site" },
];

const superadminSections = [{ href: "/admin/maintenance", label: "Maintenance" }];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { role } = await requireRole("admin");
  const links = role === "superadmin" ? [...sections, ...superadminSections] : sections;

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-14 grid gap-8 md:grid-cols-[14rem_1fr] items-start">
      <aside className="brick-card p-4 md:sticky md:top-24">
        <p className="display font-semibold text-brick-deep px-2">
          Gestion · {role === "superadmin" ? "superadmin" : "gérant"}
        </p>
        <nav className="mt-2 flex flex-col" aria-label="Administration">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-2 py-2 font-bold text-ink-deep hover:bg-sky"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
