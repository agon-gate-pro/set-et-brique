"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useUser } from "@clerk/nextjs";

/**
 * Onglet accroché au bord droit de l'écran, menant au catalogue. Visible sur
 * toutes les pages navigables sauf le catalogue (même destination) et
 * l'espace de gestion.
 */
export function FloatingReserveButton() {
  const pathname = usePathname();
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  const admin = role === "admin" || role === "superadmin";

  if (admin || pathname.startsWith("/catalogue") || pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/catalogue"
      aria-label="Réserver un set"
      className="fixed right-0 top-1/3 -translate-y-1/2 z-40 flex flex-col items-center gap-2 rounded-l-2xl bg-brick text-paper px-2 py-3 sm:px-2.5 sm:py-4 shadow-brick transition-[padding] hover:pr-4"
    >
      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
      <span className="hidden sm:inline text-sm font-bold tracking-wide [writing-mode:vertical-rl] rotate-180">
        Réserver un set
      </span>
    </Link>
  );
}
