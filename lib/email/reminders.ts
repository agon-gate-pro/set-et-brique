import { and, eq, inArray } from "drizzle-orm";
import { addDays, todayIso } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { loadBookingForEmail, reminderMails, type ReminderKind } from "./booking-emails";
import { sendEmail } from "./send";

/**
 * Rappels de fin de location (document « E-mails automatiques », partie B), envoyés chaque matin
 * par la tâche planifiée `/api/cron/rappels` aux sets remis et pas encore rendus :
 * - J-1 (`reminder_eve`) et J (`reminder_day`), date de retour demain ou aujourd'hui ;
 * - J+1 (`reminder_late`), retour attendu hier, sauf si les gérants ont suspendu la séquence
 *   (`bookings.reminders_paused`, retard convenu avec le client).
 * Le rappel J+2 (caution prélevée) attend le paiement Stripe : rien n'est prélevé aujourd'hui.
 *
 * Un seul envoi par étape et par réservation : la ligne de `email_log` est réservée avant
 * l'envoi, l'index unique `email_log_reminder_idx` écarte un second passage. Une étape manquée
 * (tâche qui n'a pas tourné un jour) n'est pas rattrapée le lendemain.
 */
export async function runReminders(today = todayIso()) {
  const steps: { kind: ReminderKind; endDate: string }[] = [
    { kind: "reminder_eve", endDate: addDays(today, 1) },
    { kind: "reminder_day", endDate: today },
    { kind: "reminder_late", endDate: addDays(today, -1) },
  ];

  const due = await db
    .select({
      id: schema.bookings.id,
      endDate: schema.bookings.endDate,
      remindersPaused: schema.bookings.remindersPaused,
    })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "picked_up"),
        inArray(
          schema.bookings.endDate,
          steps.map((s) => s.endDate),
        ),
      ),
    );

  const results: { bookingId: string; kind: ReminderKind; status: string }[] = [];
  for (const booking of due) {
    const step = steps.find((s) => s.endDate === booking.endDate);
    if (!step) continue;
    if (step.kind === "reminder_late" && booking.remindersPaused) continue;

    const full = await loadBookingForEmail(booking.id);
    if (!full) continue;
    const mail = reminderMails[step.kind](full);

    // Réserve l'étape : si la ligne existe déjà, ce rappel est parti (ou part) ailleurs.
    const [claimed] = await db
      .insert(schema.emailLog)
      .values({
        bookingId: booking.id,
        kind: step.kind,
        recipient: mail.to,
        subject: mail.content.subject,
        status: "pending",
      })
      .onConflictDoNothing()
      .returning({ id: schema.emailLog.id });
    if (!claimed) continue;

    const status = await sendEmail({ ...mail, bookingId: booking.id, logId: claimed.id });
    results.push({ bookingId: booking.id, kind: step.kind, status });
  }
  return results;
}
