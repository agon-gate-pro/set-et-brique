import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/lib/site";

/** Image des partages (Facebook, WhatsApp, Instagram, LinkedIn…) : logo sur fond jaune, nom et accroche. */
export const alt = `${site.name} · ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Poppins (police du site) en TTF depuis Google Fonts ; à défaut, la police par défaut de `next/og`. */
async function poppins(weight: 600 | 800) {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Poppins:wght@${weight}`, {
      // Un navigateur ancien reçoit du TTF ou du WOFF, les formats lus par le moteur de rendu (pas le WOFF2).
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0" },
      cache: "force-cache",
    }).then((r) => r.text());
    const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|woff)'\)/)?.[1];
    if (!url) return null;
    const data = await fetch(url, { cache: "force-cache" }).then((r) => r.arrayBuffer());
    return { name: "Poppins", data, weight, style: "normal" as const };
  } catch {
    return null;
  }
}

export default async function Image() {
  // Le fichier est un JPEG malgré son extension : le type doit être le vrai pour que l'image s'affiche.
  const logo = await readFile(join(process.cwd(), "public/images/logo-set-et-brique.png"));
  const logoSrc = `data:image/jpeg;base64,${logo.toString("base64")}`;
  const fonts = (await Promise.all([poppins(800), poppins(600)])).filter((f) => f !== null);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          background: "#fcd54b",
          color: "#172554",
          fontFamily: fonts.length > 0 ? "Poppins" : "sans-serif",
        }}
      >
        <img src={logoSrc} alt="" width={320} height={320} style={{ borderRadius: 48 }} />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05 }}>{site.name}</div>
          <div style={{ marginTop: 24, fontSize: 40, fontWeight: 600, color: "#334155" }}>{site.tagline}</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#e3000b", fontWeight: 700 }}>Louez. Construisez. Rapportez.</div>
        </div>
      </div>
    ),
    // Sans `fonts`, `next/og` charge sa police par défaut ; un tableau vide ne le fait pas.
    fonts.length > 0 ? { ...size, fonts } : size,
  );
}
