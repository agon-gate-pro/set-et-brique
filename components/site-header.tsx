"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  Gift,
  Lightbulb,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Settings,
  ShoppingBag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Show, SignOutButton, useUser } from "@clerk/nextjs";
import { nav, site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const closeMenu = useCallback(() => setOpen(false), []);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  const admin = role === "admin" || role === "superadmin";
  const pathname = usePathname();
  // Page courante : trait jaune sous le lien. Les ancres de l'accueil (« /#contact »…) ne sont pas des pages.
  const isCurrent = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  const currentClass = "underline decoration-sun-deep decoration-[3px] underline-offset-[10px]";

  useEffect(() => {
    if (!accountOpen) return;
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [accountOpen]);

  const [firstName, setFirstName] = useState<string | null>(null);
  // Réservations qui attendent le client (payer, répondre à une date proposée) : pastille du compte.
  const [pendingActions, setPendingActions] = useState(0);
  const loadCustomerName = useCallback(() => {
    fetch("/api/customer-name")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { firstName: string | null; lastName: string | null; pendingActions: number } | null) => {
        setFirstName(data?.firstName || null);
        setPendingActions(data?.pendingActions ?? 0);
      })
      .catch(() => {});
  }, []);

  // Relu à chaque changement de page : après un paiement ou une réponse à une date proposée,
  // la pastille suit sans recharger le site.
  useEffect(() => {
    if (user) loadCustomerName();
  }, [user, pathname, loadCustomerName]);
  // Après une déconnexion, le dernier chiffre lu ne doit pas rester affiché.
  const actionCount = user ? pendingActions : 0;
  const pendingLabel = actionCount > 0 ? `, ${actionCount} action${actionCount > 1 ? "s" : ""} en attente` : "";

  useEffect(() => {
    window.addEventListener("customer-profile-updated", loadCustomerName);
    return () => window.removeEventListener("customer-profile-updated", loadCustomerName);
  }, [loadCustomerName]);

  return (
    <>
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-xl border-b border-slate-ink/10">
      <div className="mx-auto max-w-7xl px-5 md:px-8 flex items-center justify-between h-20 gap-2 sm:gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          onClick={() => setOpen(false)}
        >
          <span className="flex items-center justify-center rounded-2xl border border-slate-ink/10 bg-paper p-1.5 shadow-brick-sm transition-transform group-hover:scale-105">
            <Image
              src="/images/logo-set-et-brique.png"
              alt=""
              width={48}
              height={48}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl"
              priority
            />
          </span>
          <span className="display whitespace-nowrap max-[339px]:sr-only text-base min-[380px]:text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-ink-deep group-hover:text-brick transition-colors">
            {site.name}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center" aria-label="Principale">
          <div className="flex items-center gap-4 xl:gap-5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={`whitespace-nowrap font-semibold text-[15px] text-ink-deep hover:text-brick-deep transition-colors ${
                item.wideOnly
                  ? admin
                    ? "hidden"
                    : "hidden xl:inline"
                  : item.adminWideOnly && admin
                    ? "hidden xl:inline"
                    : ""
              } ${isCurrent(item.href) ? currentClass : ""}`}
            >
              {item.label}
            </Link>
          ))}
          <Show when="signed-out">
            <Link
              href="/connexion"
              aria-current={isCurrent("/connexion") ? "page" : undefined}
              className={`whitespace-nowrap font-semibold text-[15px] text-ink-deep hover:text-brick-deep transition-colors ${
                isCurrent("/connexion") ? currentClass : ""
              }`}
            >
              Connexion
            </Link>
          </Show>
          </div>
          <Show when="signed-in">
            {/* Zone du compte, séparée des liens du site par un filet : sans elle, gestion et compte
                se collaient aux liens (retour d'Alexis, 24 septembre 2026). */}
            <div className="ml-5 xl:ml-6 pl-5 xl:pl-6 border-l border-slate-ink/15 flex items-center gap-3">
              {admin ? (
                <Link
                  href="/admin"
                  className="whitespace-nowrap font-bold text-[15px] text-ink-deep bg-sun rounded-full px-3.5 py-1.5 hover:brightness-95 transition"
                >
                  <span className="xl:hidden">Gestion</span>
                  <span className="hidden xl:inline">Espace de gestion</span>
                </Link>
              ) : null}
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-label={`${firstName ? `Mon compte (${firstName})` : "Mon compte"}${pendingLabel}`}
                  className={`flex items-center gap-2 rounded-full hover:bg-sun/25 transition-colors cursor-pointer ${
                    admin ? "" : "xl:border xl:border-sun-deep/30 xl:bg-sun/15 xl:py-1 xl:pl-1 xl:pr-3.5 xl:shadow-brick-sm"
                  }`}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun text-sm font-bold text-ink-deep">
                    {firstName ? firstName[0].toUpperCase() : null}
                    <PendingBadge count={actionCount} className="absolute -right-1.5 -top-1.5" />
                  </span>
                  {/* Gérant : avatar seul, la barre porte déjà « Espace de gestion ». */}
                  {firstName && !admin ? (
                    <span className="hidden xl:inline whitespace-nowrap font-semibold text-sm text-ink-deep">{firstName}</span>
                  ) : null}
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-ink/10 bg-paper shadow-brick-sm py-2 z-50"
                  >
                    <Link
                      href="/compte"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 font-semibold text-sm text-ink-deep hover:bg-sky transition-colors"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Mes locations
                      <PendingBadge count={actionCount} className="ml-auto" />
                    </Link>
                    <Link
                      href="/compte/profil"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 font-semibold text-sm text-ink-deep hover:bg-sky transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Gérer mon compte
                    </Link>
                    <div className="my-1.5 border-t border-slate-ink/10" />
                    <SignOutButton>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 font-semibold text-sm text-brick-deep hover:bg-sky transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                      </button>
                    </SignOutButton>
                  </div>
                ) : null}
              </div>
            </div>
          </Show>
        </nav>

        {/* Menu replié : le catalogue reste accessible d'un geste, à côté du burger. */}
        <div className="lg:hidden flex items-center gap-1.5 shrink-0">
          <Link
            href="/catalogue"
            onClick={() => setOpen(false)}
            aria-current={isCurrent("/catalogue") ? "page" : undefined}
            className="flex items-center gap-1.5 rounded-xl border border-slate-ink/15 px-2.5 py-2 text-sm font-bold text-ink-deep hover:bg-sky transition-colors"
          >
            <BookOpen className="hidden min-[400px]:block h-4 w-4" aria-hidden />
            <span className={isCurrent("/catalogue") ? "underline decoration-sun-deep decoration-[3px] underline-offset-[6px]" : ""}>
              Catalogue
            </span>
          </Link>
          <button
            type="button"
            className="relative flex items-center justify-center rounded-xl border border-slate-ink/15 p-2.5 text-ink-deep hover:bg-sky transition-colors"
            aria-label={`${open ? "Fermer le menu" : "Ouvrir le menu"}${pendingLabel}`}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {/* Sur mobile, le rond du compte est dans le menu replié : la pastille se pose sur le burger. */}
            <PendingBadge count={actionCount} className="absolute -right-2 -top-2" />
          </button>
        </div>
      </div>

    </header>
    {open ? (
      <MobileMenu
        onClose={closeMenu}
        admin={admin}
        actionCount={actionCount}
        isCurrent={isCurrent}
      />
    ) : null}
    </>
  );
}

/** Icône de chaque lien du menu mobile. */
const navIcons: Record<string, LucideIcon> = {
  "/#concept": Lightbulb,
  "/catalogue": BookOpen,
  "/bons-cadeaux": Gift,
  "/qui-sommes-nous": Users,
  "/#vinted": ShoppingBag,
  "/#contact": Mail,
};

/**
 * Menu mobile (8 octobre 2026) : panneau qui glisse depuis la droite par-dessus la page (80 % de
 * la largeur, 20 rem au plus), page assombrie et bloquée derrière. Avant, la liste se dépliait
 * sous l'en-tête, couvrait presque tout l'écran et la page défilait derrière. Rendu à côté de
 * l'en-tête et non dedans : son `backdrop-blur` ferait d'un élément fixe enfant un élément
 * limité à l'en-tête. Fermeture : croix, toucher la page, Échap, changement de page.
 */
function MobileMenu({
  onClose,
  admin,
  actionCount,
  isCurrent,
}: {
  onClose: () => void;
  admin: boolean;
  actionCount: number;
  isCurrent: (href: string) => boolean;
}) {
  const pathname = usePathname();
  const [openedOn] = useState(pathname);
  const panelRef = useRef<HTMLDivElement>(null);

  // Changement de page (lien du menu, ou retour arrière) : le menu se referme.
  useEffect(() => {
    if (pathname !== openedOn) onClose();
  }, [pathname, openedOn, onClose]);

  useEffect(() => {
    panelRef.current?.focus();
    // Page bloquée derrière le panneau.
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const linkClass = (current: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-ink-deep transition-colors ${
      current ? "bg-sun/30 font-bold" : "hover:bg-sky"
    }`;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-ink-deep/50" onClick={onClose}>
      <div
        id="menu-mobile"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
        className="drawer-in focus-outline-none flex h-full w-4/5 max-w-80 flex-col overflow-y-auto bg-paper shadow-brick-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-ink/10 px-4 py-3">
          <span className="display font-bold text-lg text-ink-deep">{site.name}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-ink/15 text-ink-deep cursor-pointer hover:bg-sky transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3" aria-label="Principale mobile">
          {/* Gérant : en tête et en pastille jaune, comme dans la barre sur grand écran. */}
          {admin ? (
            <Link
              href="/admin"
              onClick={onClose}
              className="self-start mb-2 font-bold text-ink-deep bg-sun rounded-full px-4 py-2 hover:brightness-95 transition"
            >
              Espace de gestion
            </Link>
          ) : null}
          {nav.map((item) => {
            const Icon = navIcons[item.href] ?? BookOpen;
            const current = isCurrent(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={onClose} aria-current={current ? "page" : undefined} className={linkClass(current)}>
                <Icon className="h-5 w-5 shrink-0 text-slate-ink" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-slate-ink/10 p-3">
          <Show when="signed-out">
            <Link
              href="/connexion"
              onClick={onClose}
              aria-current={isCurrent("/connexion") ? "page" : undefined}
              className={linkClass(isCurrent("/connexion"))}
            >
              <LogIn className="h-5 w-5 shrink-0 text-slate-ink" aria-hidden="true" />
              Connexion
            </Link>
          </Show>
          <Show when="signed-in">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-slate-ink">Mon compte</p>
            <Link href="/compte" onClick={onClose} aria-current={pathname === "/compte" ? "page" : undefined} className={linkClass(pathname === "/compte")}>
              <ClipboardList className="h-5 w-5 shrink-0 text-slate-ink" aria-hidden="true" />
              Mes locations
              <PendingBadge count={actionCount} />
            </Link>
            <Link href="/compte/profil" onClick={onClose} className={linkClass(isCurrent("/compte/profil"))}>
              <Settings className="h-5 w-5 shrink-0 text-slate-ink" aria-hidden="true" />
              Gérer mon compte
            </Link>
            <SignOutButton>
              <button type="button" onClick={onClose} className={`${linkClass(false)} w-full text-left cursor-pointer`}>
                <LogOut className="h-5 w-5 shrink-0 text-slate-ink" aria-hidden="true" />
                Se déconnecter
              </button>
            </SignOutButton>
          </Show>
        </div>
      </div>
    </div>
  );
}

/** Pastille rouge chiffrée (actions en attente du client) ; rien à zéro. */
function PendingBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-brick px-1 text-[11px] font-bold leading-none text-white ring-2 ring-paper ${className}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
