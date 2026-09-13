import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="studs-ink text-white">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-14">
        <div className="bg-ink-deep rounded-2xl border border-white/10 p-8 md:p-10 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="display text-2xl font-bold">{site.name}</p>
            <p className="mt-3 max-w-sm text-white/75 leading-relaxed">
              Location de grands sets de briques de construction, remise en
              main propre autour de Lorient. Une entreprise familiale.
            </p>
            <p className="mt-6 text-sm text-white/55">
              LEGO® est une marque de The LEGO Group, qui ne sponsorise ni
              n&apos;approuve ce site. Set et Brique est une entreprise
              indépendante.
            </p>
          </div>

          <div>
            <p className="display text-lg font-semibold text-sun">Contact</p>
            <ul className="mt-3 space-y-2 text-white/85">
              <li>{site.city}</li>
              <li>
                <a href={site.phoneHref} className="hover:text-sun">
                  {site.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="hover:text-sun">
                  {site.email}
                </a>
              </li>
              <li className="pt-2 flex gap-4">
                <a
                  href={site.links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sun"
                >
                  Facebook
                </a>
                <a
                  href={site.links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sun"
                >
                  Instagram
                </a>
                <a
                  href={site.links.vinted}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sun"
                >
                  Vinted
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="display text-lg font-semibold text-sun">Le site</p>
            <ul className="mt-3 space-y-2 text-white/85">
              <li>
                <Link href="/#concept" className="hover:text-sun">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link href="/catalogue" className="hover:text-sun">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/qui-sommes-nous" className="hover:text-sun">
                  Qui sommes-nous
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-sun">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/cgu" className="hover:text-sun">
                  Conditions générales d&apos;utilisation
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm text-white/60">
          © {new Date().getFullYear()} Set et Brique. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
