import Link from "next/link";

export default function NotFound() {
  return (
    <section className="studs-sky min-h-[60vh] flex items-center">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16">
        <div className="brick-card p-8 md:p-10 max-w-xl">
          <h1 className="text-4xl md:text-5xl font-bold">
            Il manque une pièce
          </h1>
          <p className="mt-4 text-lg text-slate-ink leading-relaxed">
            Cette page n&apos;existe pas ou a été déplacée.
          </p>
          <Link href="/" className="btn btn-brick mt-7">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </section>
  );
}
