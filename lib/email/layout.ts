import { site } from "@/lib/site";

/**
 * Mise en page commune des e-mails (module 10) : un titre facultatif, des blocs de texte, un
 * bouton, puis la signature et le pied de page, identiques partout (document « E-mails
 * automatiques », règles communes). Chaque e-mail part en HTML et en texte brut.
 */

export type EmailBlock =
  | { type: "p"; text: string }
  /** Encadré : le bloc de rappel de la réservation, ou un rendez-vous. */
  | { type: "box"; lines: string[] }
  | { type: "list"; items: string[] };

export type EmailContent = {
  subject: string;
  /** Accroche en tête de l'e-mail, en gros. */
  heading?: string;
  blocks: EmailBlock[];
  button?: { label: string; href: string };
  /** E-mails aux gérants : pas de signature ni de pied de page client. */
  internal?: boolean;
};

const colors = {
  brick: "#e3000b",
  inkDeep: "#172554",
  slateInk: "#334155",
  sky: "#f8fafc",
  border: "#e2e8f0",
};

const signature = [
  "À bientôt,",
  "Marion et Gaëtan",
  `Set et Brique · ${site.address}`,
  `${site.phone} · ${site.email}`,
];

const footer =
  "Vous recevez cet e-mail parce que vous avez une réservation chez Set et Brique. Retrouvez toutes vos locations dans votre espace.";

function escape(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Lien absolu vers le site, pour les boutons. */
export function siteLink(path: string) {
  return new URL(path, site.url).toString();
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const p = (inner: string, extra = "") =>
    `<p style="${font}margin:0 0 16px;font-size:16px;line-height:1.55;color:${colors.slateInk};${extra}">${inner}</p>`;

  const htmlBlocks = content.blocks.map((block) => {
    switch (block.type) {
      case "p":
        return p(escape(block.text));
      case "box":
        return `<div style="${font}margin:0 0 16px;padding:14px 18px;border-radius:12px;background:${colors.sky};border:1px solid ${colors.border};font-size:15px;line-height:1.6;color:${colors.inkDeep};">${block.lines
          .map((line, i) => (i === 0 ? `<strong>${escape(line)}</strong>` : escape(line)))
          .join("<br>")}</div>`;
      case "list":
        return `<ul style="${font}margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.55;color:${colors.slateInk};">${block.items
          .map((item) => `<li style="margin:0 0 6px;">${escape(item)}</li>`)
          .join("")}</ul>`;
    }
  });

  const button = content.button
    ? `<p style="margin:8px 0 24px;"><a href="${escape(content.button.href)}" style="${font}display:inline-block;padding:12px 22px;border-radius:999px;background:${colors.brick};color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">${escape(content.button.label)}</a></p>`
    : "";

  const heading = content.heading
    ? `<h1 style="${font}margin:0 0 20px;font-size:24px;line-height:1.3;color:${colors.inkDeep};">${escape(content.heading)}</h1>`
    : "";

  const closing = content.internal
    ? ""
    : `${p(signature.map(escape).join("<br>"), `margin-top:24px;`)}
      <p style="${font}margin:24px 0 0;padding-top:16px;border-top:1px solid ${colors.border};font-size:13px;line-height:1.5;color:#64748b;">${escape(footer)} <a href="${siteLink("/compte")}" style="color:#64748b;">Mon espace</a></p>`;

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(content.subject)}</title></head>
<body style="margin:0;padding:0;background:${colors.sky};">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:20px;border:1px solid ${colors.border};padding:28px 24px;">
      <p style="${font}margin:0 0 20px;font-size:14px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${colors.brick};">Set et Brique</p>
      ${heading}
      ${htmlBlocks.join("\n      ")}
      ${button}
      ${closing}
    </div>
  </div>
</body>
</html>`;

  const textParts: string[] = [];
  if (content.heading) textParts.push(content.heading);
  for (const block of content.blocks) {
    if (block.type === "p") textParts.push(block.text);
    if (block.type === "box") textParts.push(block.lines.join("\n"));
    if (block.type === "list") textParts.push(block.items.map((item) => `- ${item}`).join("\n"));
  }
  if (content.button) textParts.push(`${content.button.label} : ${content.button.href}`);
  if (!content.internal) {
    textParts.push(signature.join("\n"));
    textParts.push(`${footer} ${siteLink("/compte")}`);
  }

  return { html, text: textParts.join("\n\n") };
}
