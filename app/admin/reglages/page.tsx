import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Réglages", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole("admin");
  const [paymentDelayHours, turnaroundDays, minRentalDays] = await Promise.all([
    getSetting("payment_delay_hours"),
    getSetting("turnaround_days"),
    getSetting("min_rental_days"),
  ]);

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold">Réglages</h1>
      <p className="mt-3 text-sm text-slate-ink">Les règles de fonctionnement des réservations.</p>
      <SettingsForm values={{ paymentDelayHours, turnaroundDays, minRentalDays }} />
    </>
  );
}
