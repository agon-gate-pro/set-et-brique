"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Show, SignOutButton, useUser } from "@clerk/nextjs";
import { nav, site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  const admin = role === "admin" || role === "superadmin";

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
      <div className="mx-auto max-w-7xl px-5 md:px-8 flex items-center justify-between h-20 gap-4">
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
          <span className="display whitespace-nowrap text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-ink-deep group-hover:text-brick transition-colors">
            {site.name}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-4 xl:gap-5" aria-label="Principale">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap font-semibold text-[15px] text-ink-deep hover:text-brick-deep transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <Show when="signed-out">
            <Link
              href="/connexion"
              className="whitespace-nowrap font-semibold text-[15px] text-ink-deep hover:text-brick-deep transition-colors"
            >
              Connexion
            </Link>
          </Show>
          {admin ? (
            <Link
              href="/admin"
              className="whitespace-nowrap font-bold text-[15px] text-ink-deep bg-sun rounded-full px-3.5 py-1.5 hover:brightness-95 transition"
            >
              Espace de gestion
            </Link>
          ) : null}
          <Show when="signed-in">
            <div className="flex items-center gap-1.5">
              <Link
                href="/compte/profil"
                className="flex items-center gap-2 rounded-full xl:border xl:border-slate-ink/15 xl:bg-paper xl:py-1 xl:pl-1 xl:pr-3.5 xl:shadow-brick-sm hover:bg-sky transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-ink/15 bg-sky text-sm font-bold text-ink-deep">
                  {firstName ? firstName[0].toUpperCase() : null}
                </span>
                {firstName ? (
                  <span className="hidden xl:inline whitespace-nowrap font-semibold text-sm text-ink-deep">{firstName}</span>
                ) : null}
              </Link>
              <SignOutButton>
                <button
                  type="button"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-brick-deep"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </SignOutButton>
            </div>
          </Show>
          {admin ? null : (
            <Link href="/catalogue" className="btn btn-brick whitespace-nowrap text-sm py-2.5 px-4">
              Réserver un set
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="lg:hidden flex items-center justify-center rounded-xl border border-slate-ink/15 p-2.5 text-ink-deep hover:bg-sky transition-colors shrink-0"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
              className="font-bold text-lg text-ink-deep py-3"
            >
              {item.label}
            </Link>
          ))}
          <Show when="signed-out">
            <Link
              href="/connexion"
              onClick={() => setOpen(false)}
              className="font-bold text-lg text-ink-deep py-3"
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
              Mon compte
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
          {admin ? null : (
            <Link
              href="/catalogue"
              onClick={() => setOpen(false)}
              className="btn btn-brick mt-3 self-start"
            >
              Réserver un set
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
