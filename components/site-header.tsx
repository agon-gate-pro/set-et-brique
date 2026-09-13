"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import { nav, site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-xl border-b border-slate-ink/10">
      <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-20">
        <Link
          href="/"
          className="flex items-center gap-3 group"
          onClick={() => setOpen(false)}
        >
          <span className="flex items-center justify-center rounded-2xl border border-slate-ink/10 bg-paper p-1.5 shadow-brick-sm transition-transform group-hover:scale-105">
            <Image
              src="/images/logo-set-et-brique.png"
              alt=""
              width={44}
              height={44}
              className="rounded-xl"
              priority
            />
          </span>
          <span className="display text-xl font-bold tracking-tight text-ink-deep group-hover:text-brick transition-colors">
            {site.name}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Principale">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-bold text-ink-deep hover:text-brick-deep"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/catalogue" className="btn btn-brick text-base py-3 px-5">
            Réserver un set
          </Link>
          <Show when="signed-out">
            <Link href="/connexion" className="font-bold text-ink-deep hover:text-brick-deep">
              Connexion
            </Link>
          </Show>
          <Show when="signed-in">
            <UserButton
              userProfileMode="navigation"
              userProfileUrl="/compte"
              appearance={{ elements: { avatarBox: "h-10 w-10 border-2 border-slate-ink/15 rounded-full" } }}
            />
          </Show>
        </nav>

        <button
          type="button"
          className="md:hidden flex items-center justify-center rounded-xl border border-slate-ink/15 p-2.5 text-ink-deep hover:bg-sky transition-colors"
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
        className="md:hidden border-t border-slate-ink/10 bg-paper"
      >
        <nav className="mx-auto max-w-6xl px-5 py-4 flex flex-col gap-1" aria-label="Principale mobile">
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
          </Show>
          <Link
            href="/catalogue"
            onClick={() => setOpen(false)}
            className="btn btn-brick mt-3 self-start"
          >
            Réserver un set
          </Link>
        </nav>
      </div>
    </header>
  );
}
