import Image from "next/image";
import { Fredoka } from "next/font/google";
import QRCode from "qrcode";
import { formatCents, formatDateLong } from "@/lib/format";
import { site } from "@/lib/site";

// Police ronde et ludique, réservée au bon cadeau : la plus proche, sur Google Fonts, de la
// police Canva de la maquette de Marion (octobre 2026). Sniglet, essayée d'abord, n'existe qu'en
// 400 (trop fin) et 800 (lettres du code qui se confondent) : Fredoka a un demi-gras lisible.
const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600"] });

/**
 * Bandeau de 200 × 90 mm (maquette de Marion, octobre 2026) : trois bons tiennent l'un sous
 * l'autre sur une page A4 (marge d'impression de 5 mm, voir `@page` dans `app/globals.css`),
 * à découper le long du pointillé. Le QR code mène au catalogue public (`site.url`, voir
 * `lib/site.ts`), pas à une page interne à l'admin.
 */
export async function PrintVoucherCard({
  voucher,
  className = "",
}: {
  voucher: { code: string; amountCents: number; expiresAt: Date };
  className?: string;
}) {
  const qrDataUrl = await QRCode.toDataURL(`${site.url}/catalogue`, {
    margin: 0,
    width: 400,
    color: { dark: "#000000", light: "#0000" },
  });

  return (
    <div
      className={`flex h-[90mm] w-[200mm] shrink-0 flex-col border border-dashed border-slate-ink/40 bg-paper px-[6mm] py-[5mm] text-black ${className}`}
    >
      <div className="flex items-start gap-[4mm]">
        <Image
          src="/images/logo-set-et-brique.png"
          alt=""
          width={160}
          height={160}
          className="h-[30mm] w-[30mm] shrink-0 object-contain"
        />
        <div className="flex flex-1 flex-col items-center pt-[2mm] text-center">
          <p className={`${fredoka.className} text-[5.4mm] font-semibold leading-[1.3]`}>
            La location de sets Lego, Pantasy ou Mega Bloks
            <br />
            dans le pays de Lorient
          </p>
          <p className="display mt-[3mm] text-[8.5mm] font-bold uppercase leading-none text-brick">Bon cadeau</p>
        </div>
      </div>

      <div className="flex flex-1 items-center">
        <div className="min-w-0 flex-1">
          <p className={`${fredoka.className} text-[13mm] font-semibold leading-none tracking-wide`}>
            {voucher.code}
          </p>
          <p className={`${fredoka.className} mt-[2mm] pl-[3mm] text-[8mm] font-semibold leading-none text-leaf-deep`}>
            {formatVoucherAmount(voucher.amountCents)}
          </p>
        </div>
        <div className="flex h-[30mm] shrink-0 items-center border-l-[0.6mm] border-slate-ink/50 pl-[12mm] pr-[4mm]">
          {/* Data URI générée à la volée : next/image n'apporte rien ici (pas d'optimisation possible). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="" className="h-[30mm] w-[30mm]" />
        </div>
      </div>

      <p className="text-center text-[3.4mm] leading-snug text-slate-ink">
        Valable jusqu&apos;au {formatDateLong(voucher.expiresAt)}. Non-nominatif. Usage unique. Caution due
        séparément.
      </p>
    </div>
  );
}

/** « 20 € » pour un montant rond (comme sur la maquette), « 12,50 € » sinon. */
function formatVoucherAmount(cents: number) {
  return cents % 100 === 0 ? `${(cents / 100).toLocaleString("fr-FR")} €` : formatCents(cents);
}
