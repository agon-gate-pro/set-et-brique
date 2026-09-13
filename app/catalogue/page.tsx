import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Le catalogue de sets à louer chez Set et Brique, avec réservation en ligne.",
};

export default function CataloguePage() {
  return (
    <section className="studs-sky border-b border-slate-ink/10">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24 grid gap-10 md:grid-cols-[1.2fr_1fr] items-start">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold">Le catalogue</h1>
          <p className="mt-5 text-xl text-slate-ink leading-relaxed max-w-xl">
            La réservation en ligne directement sur ce site est en cours de
            construction. En attendant, tous nos sets sont visibles et
            réservables sur l&apos;application Poppins.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={site.links.poppinsApp}
              className="btn btn-brick md:hidden"
            >
              Ouvrir le catalogue dans Poppins
            </a>
            <a
              href={site.links.poppinsWeb}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-brick hidden md:inline-flex"
            >
              Voir le catalogue sur Poppins
            </a>
            <a href={`mailto:${site.email}`} className="btn btn-paper">
              Nous écrire
            </a>
          </div>
        </div>
        <div className="brick-card p-6 flex flex-col items-center text-center">
          <Image
            src="/images/qr-poppins.png"
            alt="QR code vers le catalogue Set et Brique sur Poppins"
            width={220}
            height={220}
          />
          <p className="mt-4 font-semibold">
            Scannez pour ouvrir le catalogue sur votre téléphone
          </p>
        </div>
      </div>
    </section>
  );
}
