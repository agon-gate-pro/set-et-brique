import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L'alias Vercel de la démo renvoyait le même site en 200 : doublon pour les moteurs.
  // Les webhooks Stripe restent exclus (Stripe ne suit pas les redirections).
  async redirects() {
    return [
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "set-et-brique.vercel.app" }],
        destination: "https://set-et-brique.com/:path",
        permanent: true,
      },
    ];
  },
  images: {
    // 75 : défaut de Next (logos, illustrations). 90 : photos des sets (`PHOTO_QUALITY`,
    // `components/cropped-image.tsx`), où la compression se voyait sur les bords nets
    // et les couleurs franches des briques.
    qualities: [75, 90],
    remotePatterns: [
      // Photos des sets, stockées sur Vercel Blob
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
