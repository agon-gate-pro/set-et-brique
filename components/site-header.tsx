"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ClipboardList, LogOut, Menu, Settings, X } from "lucide-react";
import { Show, SignOutButton, useUser } from "@clerk/nextjs";
import { nav, site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
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
  const loadCustomerName = useCallback(() => {
    fetch("/api/customer-name")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { firstName: string | null; lastName: string | null } | null) => {
        setFirstName(data?.firstName || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) loadCustomerName();
  }, [user, loadCustomerName]);

  useEffect(() => {
    window.addEventListener("customer-profile-updated", loadCustomerName);
    return () => window.removeEventListener("customer-profile-updated", loadCustomerName);
  }, [loadCustomerName]);

  return (
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
                  aria-label={firstName ? `Mon compte (${firstName})` : "Mon compte"}
                  className={`flex items-center gap-2 rounded-full hover:bg-sun/25 transition-colors cursor-pointer ${
                    admin ? "" : "xl:border xl:border-sun-deep/30 xl:bg-sun/15 xl:py-1 xl:pl-1 xl:pr-3.5 xl:shadow-brick-sm"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun text-sm font-bold text-ink-deep">
                    {firstName ? firstName[0].toUpperCase() : null}
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
            className="flex items-center justify-center rounded-xl border border-slate-ink/15 p-2.5 text-ink-deep hover:bg-sky transition-colors"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="lg:hidden border-t border-slate-ink/10 bg-paper"
      >
        <nav className="mx-auto max-w-7xl px-5 py-4 flex flex-col gap-1" aria-label="Principale mobile">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={`font-bold text-lg text-ink-deep py-3 ${isCurrent(item.href) ? currentClass : ""}`}
            >
              {item.label}
            </Link>
          ))}
          <Show when="signed-out">
            <Link
              href="/connexion"
              onClick={() => setOpen(false)}
              aria-current={isCurrent("/connexion") ? "page" : undefined}
              className={`font-bold text-lg text-ink-deep py-3 ${isCurrent("/connexion") ? currentClass : ""}`}
            >
              Connexion
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/compte"
              onClick={() => setOpen(false)}
              className="font-bold text-lg text-ink-deep py-3"
            >
              Mes locations
            </Link>
            <Link
              href="/compte/profil"
              onClick={() => setOpen(false)}
              className="font-bold text-lg text-ink-deep py-3"
            >
              Gérer mon compte
            </Link>
            <SignOutButton>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-bold text-lg text-ink-deep py-3 text-left cursor-pointer"
              >
                Se déconnecter
              </button>
            </SignOutButton>
          </Show>
          {admin ? (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="font-bold text-lg text-ink-deep py-3"
            >
              Espace de gestion
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
