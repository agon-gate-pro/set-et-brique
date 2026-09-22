import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { MonitorSmartphone } from "lucide-react";
import { AvailabilityBadge } from "@/components/catalogue/availability-badge";
import { AvailabilityCalendar } from "@/components/catalogue/availability-calendar";
import { isBookable, loadAvailability, loadDayAvailability } from "@/lib/availability";
import { db, schema } from "@/lib/db";
import { formatCents, formatSetNumbers, instructionTypeLabels } from "@/lib/format";
import { site } from "@/lib/site";
import { ImageCarousel } from "./image-carousel";

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

  const [availability, calendar, defaultPlan] = await Promise.all([
    loadAvailability([set]),
    loadDayAvailability(set),
    db.query.ratePlans.findFirst({ where: eq(schema.ratePlans.isDefault, true) }),
  ]);
  const a = availability.get(set.id);
  const pricePerDay = set.ratePlan?.priceCentsPerDay ?? defaultPlan?.priceCentsPerDay ?? null;
  const bookableNow = a ? isBookable(a) : false;
  // Loué ou en battement, mais avec une date de retour connue : réservable dès
  // maintenant pour plus tard, le calendrier du tunnel gère déjà les jours
  // libres/pris au cas par cas (`findFreeCopy`). Seuls réparation et retiré,
  // sans date connue, restent totalement bloqués.
  const laterDate = a && (a.status === "rented" || a.status === "turnaround") ? a.nextAvailableDate : null;

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
              <ImageCarousel images={set.images} name={set.name} />
              {set.description ? (
                <>
                  <h2 className="mt-8 text-2xl md:text-3xl font-semibold">Le set</h2>
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

            <div>
              {a ? <AvailabilityBadge availability={a} withDate /> : null}
              <h1 className="mt-3 text-4xl md:text-5xl font-bold leading-tight">{set.name}</h1>
              <p className="mt-2 text-slate-ink">
                {[set.brand !== "LEGO" ? set.brand : null, set.theme].filter(Boolean).join(" · ")}
              </p>

              <dl className="mt-6 brick-card p-5 grid gap-2.5">
                {facts
                  .filter((f): f is [string, string] => f[1] !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-slate-ink/10 pb-2 last:border-0">
                      <dt className="text-slate-ink">{label}</dt>
                      <dd className="font-semibold text-right">{value}</dd>
                    </div>
                  ))}
              </dl>

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

              <div className="mt-8">
                {/* Date déjà annoncée par la pastille au-dessus du titre (« Louez-le à partir du … »), pas la peine de la répéter ici. */}
                <div className="flex flex-wrap gap-4">
                  {bookableNow || laterDate ? (
                    <Link href={`/catalogue/${set.slug}/reserver`} className="btn btn-brick">
                      Réserver ce set
                    </Link>
                  ) : (
                    <a
                      href={`mailto:${site.email}?subject=${encodeURIComponent(`Disponibilité : ${set.name}`)}`}
                      className="btn btn-paper"
                    >
                      Être prévenu de son retour
                    </a>
                  )}
                  <a href={site.phoneHref} className="btn btn-paper">
                    {site.phone}
                  </a>
                </div>
                {laterDate ? (
                  <a
                    href={`mailto:${site.email}?subject=${encodeURIComponent(`Disponibilité : ${set.name}`)}`}
                    className="mt-3 inline-block text-sm font-semibold text-slate-ink underline underline-offset-4"
                  >
                    Être recontacté par e-mail à sa remise en stock
                  </a>
                ) : null}
              </div>

              <div className="mt-8">
                <AvailabilityCalendar from={calendar.from} to={calendar.to} days={calendar.days} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
