import Image from "next/image";
import QRCode from "qrcode";
import { formatCents, formatDateTime } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Format paysage, dimensions d'une carte de visite (85 × 55 mm) : imprimé pour être découpé et
 * remis en main propre. Le QR code mène au catalogue public (`site.url`, alias Vercel en
 * attendant le domaine final, voir `lib/site.ts`), pas à une page interne à l'admin.
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
    width: 200,
    color: { dark: "#172554", light: "#0000" },
  });

  return (
    <div
      className={`brick-card flex h-[55mm] w-[85mm] items-stretch gap-[3mm] border-2 border-dashed border-ink-deep/30 bg-paper p-[4mm] ${className}`}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-center gap-[1.5mm]">
          <Image
            src="/images/logo-set-et-brique.png"
            alt=""
            width={32}
            height={32}
            className="h-[7mm] w-[7mm] rounded-md"
          />
          <span className="display text-[2.6mm] font-bold leading-tight text-ink-deep">{site.name}</span>
        </div>
        <div>
          <p className="text-[2.2mm] font-semibold uppercase leading-tight tracking-widest text-brick">Bon cadeau</p>
          <p className="display text-[6mm] font-bold leading-tight tracking-wide font-mono">{voucher.code}</p>
          <p className="display text-[4.2mm] font-bold leading-tight text-leaf-deep">
            {formatCents(voucher.amountCents)}
          </p>
        </div>
        <p className="text-[2mm] leading-snug text-slate-ink">
          Valable jusqu&apos;au {formatDateTime(voucher.expiresAt)}. Non-nominatif, usage unique. Caution due
          séparément.
        </p>
      </div>
      <div className="flex w-[20mm] shrink-0 flex-col items-center justify-center gap-[1mm] border-l border-slate-ink/15 pl-[3mm] text-center">
        {/* Data URI générée à la volée : next/image n'apporte rien ici (pas d'optimisation possible). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="" className="h-[18mm] w-[18mm]" />
        <p className="text-[1.8mm] leading-tight text-slate-ink">Notre catalogue</p>
      </div>
    </div>
  );
}
