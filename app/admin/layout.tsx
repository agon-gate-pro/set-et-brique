import { AdminNav } from "@/components/admin/nav";
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
    <div className="mx-auto max-w-6xl px-5 md:px-8 py-6 md:py-14 grid gap-6 md:gap-8 grid-cols-[minmax(0,1fr)] md:grid-cols-[14rem_minmax(0,1fr)] items-start">
      <AdminNav links={links} role={role} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
