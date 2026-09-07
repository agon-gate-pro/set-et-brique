"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { nav, site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-paper border-b-[3px] border-ink">
      <div className="mx-auto max-w-6xl px-5 md:px-8 flex items-center justify-between h-20">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo-set-et-brique.png"
            alt=""
            width={52}
            height={52}
            priority
          />
          <span className="display text-xl font-bold text-ink-deep">
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
        </nav>

        <button
          type="button"
          className="md:hidden display font-semibold text-ink-deep border-[3px] border-ink px-3 py-2"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="md:hidden border-t-[3px] border-ink bg-sky"
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
