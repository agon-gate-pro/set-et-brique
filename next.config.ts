import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Photos des sets, stockées sur Vercel Blob
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  experimental: {
    serverActions: {
      // Envoi de photos depuis l'admin
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
