import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "./social-icons";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink-deeper text-white">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex items-center justify-center rounded-xl bg-paper p-1.5">
                <Image
                  src="/images/logo-set-et-brique.png"
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
              </span>
              <span className="display text-xl font-bold text-white">{site.name}</span>
            </Link>
            <p className="mt-5 max-w-sm text-white/60 leading-relaxed">
              La première plateforme locale de location de sets de
              construction à Lorient.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={site.links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-3 font-bold text-[#1877F2] hover:opacity-80 transition-opacity"
              >
                <FacebookIcon className="h-6 w-6" />
                Facebook
              </a>
              <a
                href={site.links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-3 font-bold hover:opacity-80 transition-opacity"
              >
                <InstagramIcon className="h-6 w-6" />
                <span className="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] bg-clip-text text-transparent">
                  Instagram
                </span>
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Localisation &amp; Contact
            </p>
            <ul className="mt-5 space-y-4 text-white/80">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-brick" />
                Basé à Lorient
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-brick" />
                <a href={site.phoneHref} className="hover:text-white transition-colors">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-brick" />
                <a href={`mailto:${site.email}`} className="hover:text-white transition-colors">
                  {site.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Navigation
            </p>
            <ul className="mt-5 space-y-3 text-white/80">
              <li>
                <Link href="/#concept" className="hover:text-white transition-colors">
                  Concept
                </Link>
              </li>
              <li>
                <Link href="/qui-sommes-nous" className="hover:text-white transition-colors">
                  Qui sommes-nous ?
                </Link>
              </li>
              <li>
                <Link href="/catalogue" className="hover:text-white transition-colors">
                  Catalogue
                </Link>
              </li>
              <li>
                <a
                  href={site.links.vinted}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Boutique Vinted
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-white/10 pt-8 text-sm text-white/50 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} {site.name} - Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-white transition-colors">
              CGU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
