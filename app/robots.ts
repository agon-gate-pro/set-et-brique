import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Pages privées ou transactionnelles, hors index (elles portent aussi `robots: noindex`). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/compte", "/connexion", "/inscription", "/api/", "/catalogue/*/reserver", "/bons-cadeaux/merci"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
