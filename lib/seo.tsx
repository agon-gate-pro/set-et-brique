import { site } from "@/lib/site";

/**
 * Référencement : texte de la balise description et données structurées (JSON-LD, schema.org)
 * lues par Google, Bing et les moteurs de réponse par IA. Audit et plan dans `docs/AVANCEMENT.md`
 * (15 octobre 2026).
 */

/** Description d'une page à partir d'un texte libre : sauts de ligne et espaces repliés, coupée au mot. */
export function metaDescription(text: string | null | undefined, fallback: string, max = 160): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > max / 2 ? cut.slice(0, atWord) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

/** Latitude et longitude du lieu de la fiche Google Maps (`site.links.googleReviews`). */
const geo = { latitude: 47.7584758, longitude: -3.3585911 };

/** Set et Brique en tant que commerce local (accueil). */
export function localBusinessJsonLd() {
  const [streetAddress, rest] = site.address.split(", ");
  const [postalCode, ...locality] = (rest ?? "").split(" ");
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site.url}/#organisation`,
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.phoneHref.replace("tel:", ""),
    email: site.email,
    image: `${site.url}/opengraph-image`,
    logo: `${site.url}/images/logo-set-et-brique.png`,
    priceRange: "€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Carte bancaire",
    address: {
      "@type": "PostalAddress",
      streetAddress,
      postalCode,
      addressLocality: locality.join(" ") || "Lorient",
      addressRegion: "Bretagne",
      addressCountry: "FR",
    },
    geo: { "@type": "GeoCoordinates", ...geo },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", ...geo },
      geoRadius: site.radiusKm * 1000,
    },
    hasMap: site.links.googleReviews,
    sameAs: [site.links.facebook, site.links.instagram, site.links.vinted, site.links.googleReviews],
    makesOffer: {
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: "Location de sets de briques de construction" },
      areaServed: "Pays de Lorient",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
    },
  };
}

export type ProductJsonLdInput = {
  slug: string;
  name: string;
  description: string;
  brand: string;
  setNumbers: string[];
  theme: string | null;
  images: string[];
  pricePerDayCents: number | null;
  depositCents: number;
  /** `now` : réservable aujourd'hui ; `later` : loué, réservable pour plus tard ; `none` : indisponible. */
  availability: "now" | "later" | "none";
};

/** Un set du catalogue en tant que produit à la location (fiche). */
export function productJsonLd(p: ProductJsonLdInput) {
  const availability = {
    now: "https://schema.org/InStock",
    later: "https://schema.org/LimitedAvailability",
    none: "https://schema.org/OutOfStock",
  }[p.availability];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    url: `${site.url}/catalogue/${p.slug}`,
    image: p.images.length > 0 ? p.images : undefined,
    brand: { "@type": "Brand", name: p.brand },
    sku: p.setNumbers[0],
    category: p.theme ?? undefined,
    offers:
      p.pricePerDayCents != null
        ? {
            "@type": "Offer",
            url: `${site.url}/catalogue/${p.slug}`,
            price: (p.pricePerDayCents / 100).toFixed(2),
            priceCurrency: "EUR",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: (p.pricePerDayCents / 100).toFixed(2),
              priceCurrency: "EUR",
              unitText: "jour",
              referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText: "jour" },
            },
            availability,
            businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
            areaServed: "Pays de Lorient",
            seller: { "@id": `${site.url}/#organisation` },
            description: `Location à la journée, caution de ${(p.depositCents / 100).toLocaleString("fr-FR")} € bloquée sur la carte à la remise.`,
          }
        : undefined,
  };
}

/** Balise `<script type="application/ld+json">`, `<` échappé pour ne jamais fermer la balise. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
