import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { MonitorSmartphone } from "lucide-react";
import { AvailabilityBadge } from "@/components/catalogue/availability-badge";
import { isBookable, loadAvailability } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { formatCents, formatSetNumbers, instructionTypeLabels } from "@/lib/format";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

async function loadSet(slug: string) {
  return db.query.sets.findFirst({
    where: and(eq(schema.sets.slug, slug), eq(schema.sets.status, "published")),
    with: {
      images: { orderBy: [asc(schema.setImages.sortOrder), asc(schema.setImages.createdAt)] },
      ratePlan: true,
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/catalogue/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const set = await loadSet(slug);
  if (!set) return { title: "Set introuvable" };
  return {
    title: set.name,
    description: set.description?.slice(0, 160) ?? `${set.name}, à louer chez Set et Brique.`,
  };
}

export default async function SetPage({ params }: PageProps<"/catalogue/[slug]">) {
  const { slug } = await params;
  const set = await loadSet(slug);
  if (!set) notFound();

  const [availability, defaultPlan] = await Promise.all([
    loadAvailability([set]),
    db.query.ratePlans.findFirst({ where: eq(schema.ratePlans.isDefault, true) }),
  ]);
  const a = availability.get(set.id);
  const pricePerDay = set.ratePlan?.priceCentsPerDay ?? defaultPlan?.priceCentsPerDay ?? null;
  const [cover, ...others] = set.images;

  // Poids volontairement absent : usage interne (spécification, module 1).
  const facts: [string, string | null][] = [
    ["Pièces", set.pieces != null ? set.pieces.toLocaleString("fr-FR") : null],
    ["Figurines", set.minifigCount != null ? String(set.minifigCount) : null],
    [
      "Notices",
      set.instructionCount != null
        ? `${set.instructionCount} (${instructionTypeLabels[set.instructionType].toLowerCase()})`
        : instructionTypeLabels[set.instructionType],
    ],
    ["Dimensions une fois construit", set.dimensions],
    ["Temps de montage estimé", set.buildTime],
    ["Âge conseillé", set.ageMin != null ? `dès ${set.ageMin} ans` : null],
    ["Marque", set.brand],
    ["Numéro de boîte", set.setNumbers.length > 0 ? formatSetNumbers(set.setNumbers) : null],
  ];

  return (
    <>
      <section className="studs-sky border-b border-slate-ink/10">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-14">
          <Link href="/catalogue" className="font-bold underline underline-offset-4">
            Retour au catalogue
          </Link>
          <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_1fr] items-start">
            <div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-paper border border-slate-ink/15">
                {cover ? (
                  <Image src={cover.url} alt={cover.alt ?? set.name} fill priority sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-slate-ink/50 font-semibold">Photo à venir</div>
                )}
              </div>
              {others.length > 0 ? (
                <ul className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {others.map((img) => (
                    <li key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-paper border border-slate-ink/15">
                      <Image src={img.url} alt={img.alt ?? ""} fill sizes="120px" className="object-cover" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              {a ? <AvailabilityBadge availability={a} withDate /> : null}
              <h1 className="mt-3 text-4xl md:text-5xl font-bold leading-tight">{set.name}</h1>
              <p className="mt-2 text-slate-ink">
                {[set.brand !== "LEGO" ? set.brand : null, set.theme].filter(Boolean).join(" · ")}
              </p>

              <p className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {pricePerDay != null ? (
                  <span className="display text-4xl font-bold text-brick">
                    {formatCents(pricePerDay)}
                    <span className="text-lg font-semibold text-slate-ink"> / jour</span>
                  </span>
                ) : null}
                <span className="text-slate-ink">caution {formatCents(set.depositCents)}</span>
              </p>
              <p className="mt-2 text-sm text-slate-ink">
                Durée libre, comptée en jours calendaires. La caution est bloquée sur votre carte
                à la remise, jamais débitée sauf casse ou perte.
              </p>

              {set.instructionType === "digital" ? (
                <p className="mt-6 flex gap-3 rounded-xl border border-ink/20 bg-paper p-4 text-ink-deep">
                  <MonitorSmartphone className="h-6 w-6 shrink-0 text-ink" aria-hidden />
                  <span>
                    <strong>Notice numérique.</strong> Le montage se suit sur un téléphone, une
                    tablette ou un ordinateur connecté à internet : il n&apos;y a pas de livret
                    papier dans la boîte.
                  </span>
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-4">
                {a && isBookable(a) ? (
                  <a href={`mailto:${site.email}?subject=${encodeURIComponent(`Réservation : ${set.name}`)}`} className="btn btn-brick">
                    Réserver ce set
                  </a>
                ) : (
                  <a href={`mailto:${site.email}?subject=${encodeURIComponent(`Disponibilité : ${set.name}`)}`} className="btn btn-paper">
                    Être prévenu de son retour
                  </a>
                )}
                <a href={site.phoneHref} className="btn btn-paper">
                  {site.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-16 grid gap-10 md:grid-cols-[1.1fr_1fr] items-start">
        <div>
          {set.description ? (
            <>
              <h2 className="text-2xl md:text-3xl font-semibold">Le set</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-ink whitespace-pre-line">{set.description}</p>
            </>
          ) : null}
          {set.publicNote ? (
            <div className="mt-8 brick-card bg-sun/40 p-5">
              <h2 className="text-xl font-semibold">Bon à savoir</h2>
              <p className="mt-2 leading-relaxed text-ink-deep whitespace-pre-line">{set.publicNote}</p>
            </div>
          ) : null}
        </div>

        <dl className="brick-card p-6 grid gap-3">
          <h2 className="text-2xl font-semibold">En bref</h2>
          {facts
            .filter((f): f is [string, string] => f[1] !== null)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-ink/10 pb-2 last:border-0">
                <dt className="text-slate-ink">{label}</dt>
                <dd className="font-semibold text-right">{value}</dd>
              </div>
            ))}
        </dl>
      </section>
    </>
  );
}
