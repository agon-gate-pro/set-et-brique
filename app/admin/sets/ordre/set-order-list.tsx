"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { CroppedImage } from "@/components/cropped-image";
import type { ImageCrop } from "@/lib/image-crop";
import { reorderSets } from "../actions";

type Row = {
  id: string;
  name: string;
  theme: string | null;
  featured: boolean;
  cover: string | null;
  coverCrop: ImageCrop | null;
};

/**
 * Deux groupes réordonnables séparément, coups de cœur puis autres sets : dans le catalogue, un
 * coup de cœur passe toujours devant, un glisser d'un groupe à l'autre n'aurait donc pas d'effet.
 * L'ordre complet (coups de cœur puis autres) est enregistré à chaque changement.
 */
export function SetOrderList({ rows }: { rows: Row[] }) {
  const [order, setOrder] = useState(() => rows.map((r) => r.id));
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setOrder(rows.map((r) => r.id));
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = order.map((id) => byId.get(id)).filter((r): r is Row => r != null);
  const featured = ordered.filter((r) => r.featured);
  const others = ordered.filter((r) => !r.featured);

  function commit(nextFeatured: Row[], nextOthers: Row[]) {
    const next = [...nextFeatured, ...nextOthers].map((r) => r.id);
    setOrder(next);
    reorderSets(next);
  }

  if (rows.length === 0) {
    return <p className="mt-6 brick-card p-6 text-slate-ink">Aucun set publié pour l&apos;instant.</p>;
  }

  return (
    <div className="mt-6 grid gap-8">
      {featured.length > 0 ? (
        <Group title="Coups de cœur" hint="Toujours en tête du catalogue" rows={featured} offset={0} onChange={(l) => commit(l, others)} />
      ) : null}
      <Group
        title={featured.length > 0 ? "Autres sets" : "Sets publiés"}
        rows={others}
        offset={featured.length}
        onChange={(l) => commit(featured, l)}
      />
    </div>
  );
}

function Group({
  title,
  hint,
  rows,
  offset,
  onChange,
}: {
  title: string;
  hint?: string;
  rows: Row[];
  /** Rang du premier set du groupe dans le catalogue, pour la numérotation. */
  offset: number;
  onChange: (rows: Row[]) => void;
}) {
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function move(from: number, to: number) {
    if (from < 0 || to < 0 || to >= rows.length || from === to) return;
    const next = rows.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function handleDrop(targetId: string) {
    const draggedId = dragId.current;
    dragId.current = null;
    setDraggingId(null);
    if (!draggedId) return;
    // Un set lâché dans l'autre groupe n'y est pas trouvé : rien ne bouge.
    move(
      rows.findIndex((r) => r.id === draggedId),
      rows.findIndex((r) => r.id === targetId),
    );
  }

  const arrow =
    "p-1.5 text-ink-deep cursor-pointer transition-colors hover:text-sea-deep disabled:cursor-default disabled:opacity-25 disabled:hover:text-ink-deep";

  return (
    <section>
      <h2 className="text-xl font-bold">
        {title}
        {hint ? <span className="ml-2 text-sm font-semibold text-slate-ink">{hint}</span> : null}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-ink">Aucun set dans ce groupe.</p>
      ) : (
        <ol className="mt-3 brick-card divide-y divide-slate-ink/10 overflow-hidden">
          {rows.map((r, i) => (
            <li
              key={r.id}
              draggable
              onDragStart={() => {
                dragId.current = r.id;
                setDraggingId(r.id);
              }}
              onDragEnd={() => {
                dragId.current = null;
                setDraggingId(null);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(r.id);
              }}
              className={`flex items-center gap-3 px-3 py-2 bg-paper cursor-grab active:cursor-grabbing hover:bg-sky ${
                draggingId === r.id ? "opacity-40" : ""
              }`}
            >
              <GripVertical className="h-5 w-5 shrink-0 text-slate-ink/50" aria-hidden />
              <span className="w-7 shrink-0 text-right text-sm font-bold text-slate-ink tabular-nums">{offset + i + 1}</span>
              <div className="relative aspect-[4/3] w-14 shrink-0 overflow-hidden rounded-md border border-slate-ink/10 bg-sky">
                {r.cover ? <CroppedImage src={r.cover} alt="" sizes="56px" crop={r.coverCrop} /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/sets/${r.id}`} className="block truncate font-semibold text-ink-deep underline-offset-4 hover:underline">
                  {r.name}
                </Link>
                {r.theme ? <span className="block truncate text-xs text-slate-ink">{r.theme}</span> : null}
              </div>
              <div className="flex shrink-0 items-center">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Monter ${r.name}`} className={arrow}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === rows.length - 1}
                  aria-label={`Descendre ${r.name}`}
                  className={arrow}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
