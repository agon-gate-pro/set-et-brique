"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ellipsis, X, type LucideIcon } from "lucide-react";
import { SECTION_ICONS as icons, SECTION_TONES, TONE_BADGE, TONE_TEXT, type Tone } from "@/components/admin/sections";

const toneOf = (href: string): Tone => SECTION_TONES[href] ?? "slate";

export type AdminLink = { href: string; label: string; separatorBefore?: boolean };

/** Rubriques en accès direct dans la barre du bas sur mobile, dans cet ordre ; les autres passent sous « Plus ». */
const PRIMARY_HREFS = ["/admin", "/admin/reservations", "/admin/sets", "/admin/bons-cadeaux"];

/** Libellés raccourcis pour tenir dans un cinquième de la largeur d'un téléphone. */
const SHORT_LABELS: Record<string, string> = {
  "/admin": "Tableau",
  "/admin/bons-cadeaux": "Bons",
};

/**
 * Menu de gestion : colonne sur grand écran ; sur mobile, barre fixe en bas de l'écran (comme
 * une application) avec les quatre rubriques du quotidien et « Plus », qui ouvre les autres dans
 * un panneau montant du bas. La section courante est mise en évidence.
 */
export function AdminNav({ links }: { links: AdminLink[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  // Next.js garde la position de défilement d'un changement de page à l'autre tant que la page
  // précédente reste visible dans la fenêtre (menu sticky) : on revient en haut nous-mêmes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <aside className="hidden md:block brick-card min-w-0 p-4 sticky top-24">
        <h2 className="inline-block whitespace-nowrap font-bold text-[15px] text-ink-deep bg-sun rounded-full px-3.5 py-1.5 mb-3">
          Espace de gestion
        </h2>
        <nav aria-label="Administration" className="mt-2 flex flex-col gap-1.5">
          {links.map((l) => {
            const active = isActive(l.href);
            const Icon = icons[l.href];
            return (
              <span key={l.href} className="contents">
                {l.separatorBefore ? <span className="my-1 border-t border-slate-ink/10" aria-hidden="true" /> : null}
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-2.5 py-2 font-bold flex items-center gap-2 ${
                    active ? "bg-ink-deep text-paper" : "text-ink-deep font-medium hover:bg-sea/15"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {l.label}
                </Link>
              </span>
            );
          })}
        </nav>
      </aside>
      <MobileTabBar links={links} isActive={isActive} pathname={pathname} />
    </>
  );
}

function MobileTabBar({
  links,
  isActive,
  pathname,
}: {
  links: AdminLink[];
  isActive: (href: string) => boolean;
  pathname: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    // Changement de page (depuis le panneau ou ailleurs) : le panneau se referme.
    setPrevPathname(pathname);
    setMoreOpen(false);
  }

  const primary = PRIMARY_HREFS.map((href) => links.find((l) => l.href === href)).filter((l): l is AdminLink => l != null);
  const more = links.filter((l) => !PRIMARY_HREFS.includes(l.href));
  // « Plus » prend la couleur de la rubrique ouverte quand elle est dans le panneau.
  const moreActiveLink = more.find((l) => isActive(l.href));
  const moreTone = moreActiveLink ? toneOf(moreActiveLink.href) : null;

  return (
    <>
      {/* `data-admin-tabbar` : réserve la hauteur de la barre en bas de page (globals.css). */}
      <nav
        aria-label="Administration"
        data-admin-tabbar
        className="md:hidden print:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-ink/10 bg-paper shadow-[0_-4px_16px_rgb(15_24_55/0.08)]"
      >
        <ul className="grid grid-cols-5">
          {primary.map((l) => (
            <li key={l.href}>
              <TabLink
                href={l.href}
                label={SHORT_LABELS[l.href] ?? l.label}
                Icon={icons[l.href]}
                tone={isActive(l.href) ? toneOf(l.href) : null}
              />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`flex w-full flex-col items-center gap-0.5 px-0.5 pt-2 pb-2.5 text-[10px] min-[380px]:text-[11px] font-semibold tracking-tight cursor-pointer ${
                moreTone ? `font-bold ${TONE_TEXT[moreTone]}` : "text-slate-ink"
              }`}
            >
              <TabIcon Icon={Ellipsis} tone={moreTone} />
              Plus
            </button>
          </li>
        </ul>
      </nav>
      {moreOpen ? <MoreSheet links={more} isActive={isActive} onClose={closeMore} /> : null}
    </>
  );
}

/** Icône d'onglet ; active (`tone` renseigné), dans une pastille de la couleur de sa rubrique, comme les titres de page. */
function TabIcon({ Icon, tone }: { Icon: LucideIcon; tone: Tone | null }) {
  return (
    <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${tone ? TONE_BADGE[tone] : ""}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function TabLink({ href, label, Icon, tone }: { href: string; label: string; Icon: LucideIcon; tone: Tone | null }) {
  return (
    <Link
      href={href}
      aria-current={tone ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 px-0.5 pt-2 pb-2.5 text-[10px] min-[380px]:text-[11px] font-semibold tracking-tight ${
        tone ? `font-bold ${TONE_TEXT[tone]}` : "text-slate-ink"
      }`}
    >
      <TabIcon Icon={Icon} tone={tone} />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

/** Panneau « Plus » : les rubriques qui ne tiennent pas dans la barre, montant du bas de l'écran. */
function MoreSheet({
  links,
  isActive,
  onClose,
}: {
  links: AdminLink[];
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus sur le panneau (lecteurs d'écran, clavier : Tab mène au premier lien), sans contour visible.
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="md:hidden print:hidden fixed inset-0 z-50 flex items-end bg-ink-deep/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-more-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="focus-outline-none w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-paper p-4 pb-6 shadow-brick-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="admin-more-title" className="inline-block font-bold text-[15px] text-ink-deep bg-sun rounded-full px-3.5 py-1.5">
            Espace de gestion
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-ink cursor-pointer transition-colors hover:bg-sky hover:text-ink-deep"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <ul className="mt-3 flex flex-col gap-1">
          {links.map((l) => {
            const active = isActive(l.href);
            const Icon = icons[l.href];
            return (
              <li key={l.href}>
                {l.separatorBefore ? <span className="my-1 block border-t border-slate-ink/10" aria-hidden="true" /> : null}
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 font-semibold ${
                    active ? TONE_BADGE[toneOf(l.href)] : "text-ink-deep hover:bg-sea/15"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
