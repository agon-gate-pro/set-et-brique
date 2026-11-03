import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Les pages privées ou transactionnelles sont hors index par leur balise `robots: noindex`, pas
 * par robots.txt : bloquées ici, Google ne lirait pas la balise et pourrait indexer l'adresse seule
 * (liens « Réserver » des fiches). Seules les routes `/api/`, sans balise, restent interdites.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
