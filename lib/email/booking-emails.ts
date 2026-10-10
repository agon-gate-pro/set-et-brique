import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "@/lib/db";
import type { BookingExtension } from "@/lib/db/schema";
import { formatCents, formatDay, formatPhone, formatWeekday } from "@/lib/format";
import { site } from "@/lib/site";
import { siteLink, type EmailBlock, type EmailContent } from "./layout";
import { sendEmail } from "./send";

/**
 * E-mails de la vie d'une réservation (module 10), d'après le document « E-mails automatiques »
 * (version de travail du 1er octobre 2026) et les accroches choisies par la cliente le 7 octobre
 * 2026, placées en tête de l'e-mail correspondant (demande reçue, acceptée, refusée, set remis,
 * veille du retour, retard, set rendu). Le reste du texte suit le document.
 *
 * Les références A1… B3 renvoient à ce document.
 */

export type BookingEmailEvent =
  | "requested"
  | "accepted"
  | "refused"
  | "cancelled_by_customer"
  | "handover_changed"
  | "picked_up"
  | "returned"
  | "payment_expired"
  | "paid";

export type ReminderKind = "reminder_eve" | "reminder_day" | "reminder_late";

async function loadBooking(bookingId: string) {
  return db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
    with: {
      customer: true,
      set: { columns: { name: true, slug: true } },
      pickupPoint: { columns: { name: true, address: true, instructions: true } },
    },
  });
}

export type BookingWithDetails = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

/* -------------------------------------------------------------------------- */
/* Mise en forme                                                              */
/* -------------------------------------------------------------------------- */

/** « samedi 18 octobre » à partir d'une date ISO. */
function longDate(iso: string) {
  return `${formatWeekday(iso)} ${formatDay(iso)}`;
}

/** « 10 h 30 », « 10 h » à partir d'une heure Postgres (« 10:30:00 »). */
function hour(value: string | null) {
  if (!value) return null;
  const [h, m] = value.split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}

const parisDeadline = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** « samedi 18 octobre à 10 h 30 », pour l'échéance de paiement. */
function deadline(date: Date) {
  const parts = Object.fromEntries(parisDeadline.formatToParts(date).map((p) => [p.type, p.value]));
  const minutes = parts.minute === "00" ? "" : ` ${parts.minute}`;
  return `${parts.weekday} ${parts.day} ${parts.month} à ${Number(parts.hour)} h${minutes}`;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function firstName(b: BookingWithDetails) {
  return b.customer.firstName?.trim() || "";
}

function hello(b: BookingWithDetails) {
  const name = firstName(b);
  return name ? `Bonjour ${name},` : "Bonjour,";
}

function customerName(b: BookingWithDetails) {
  return [b.customer.firstName, b.customer.lastName].filter(Boolean).join(" ") || b.customer.email;
}

/** « Lieu, adresse », ou ce qu'on en connaît. */
function place(b: BookingWithDetails) {
  if (!b.pickupPoint) return "le lieu convenu avec nous";
  return [b.pickupPoint.name, b.pickupPoint.address].filter(Boolean).join(", ");
}

function total(b: BookingWithDetails) {
  return b.rentalCents + (b.disassemblyCents ?? 0);
}

/** Bloc de rappel de la réservation, repris dans plusieurs e-mails. */
function recap(b: BookingWithDetails): EmailBlock {
  const time = hour(b.pickupTime);
  const lines = [
    `${b.set.name} · réservation ${b.reference}`,
    `Du ${longDate(b.startDate)} au ${longDate(b.endDate)} (${plural(b.days, "jour")})`,
    `Remise : ${place(b)}${time ? `, vers ${time}` : ""}`,
    `Location : ${formatCents(b.rentalCents)}`,
  ];
  if (b.disassemblyCents != null) lines.push(`Option set rendu monté : ${formatCents(b.disassemblyCents)}`);
  lines.push(
    `Caution : ${formatCents(b.depositCents)} (empreinte bancaire, débitée seulement en cas de casse ou de perte)`,
  );
  return { type: "box", lines };
}

const p = (text: string): EmailBlock => ({ type: "p", text });
const callUs = `appelez-nous au ${site.phone}`;

/** Consigne de retour selon l'option « rendre le set monté ». */
function returnInstructions(b: BookingWithDetails) {
  return b.disassemblyCents != null
    ? "Vous avez choisi l'option set rendu monté : rapportez-le tel quel, nous nous occupons du démontage."
    : "Rendez le set démonté, les pièces dans leurs sachets, avec la notice.";
}

/* -------------------------------------------------------------------------- */
/* Modèles                                                                    */
/* -------------------------------------------------------------------------- */

type Mail = { kind: string; to: string; content: EmailContent };

function customerMail(kind: string, b: BookingWithDetails, content: EmailContent): Mail {
  return { kind, to: b.customer.email, content };
}

function adminMail(kind: string, content: EmailContent): Mail {
  return { kind, to: site.email, content: { ...content, internal: true } };
}

/** A1. Demande reçue, au client. */
function requestReceived(b: BookingWithDetails) {
  return customerMail("request_received", b, {
    subject: `Votre demande pour ${b.set.name} est bien arrivée (${b.reference})`,
    heading: "Message bien imbriqué !",
    blocks: [
      p(hello(b)),
      p(
        "Nos ingénieurs et Maîtres constructeurs ont sorti les loupes. Nous vérifions la stabilité des plans et la solidité des briques disponibles pour votre chantier. On valide votre projet de construction dans un instant !",
      ),
      recap(b),
      p("Les dates sont déjà bloquées pour vous en attendant notre réponse, que vous recevrez par e-mail."),
      p(`Une question, un empêchement ? Répondez simplement à cet e-mail ou ${callUs}.`),
    ],
    button: { label: "Suivre ma demande", href: siteLink("/compte") },
  });
}

/** A2. Nouvelle demande, aux gérants. */
function requestNewAdmin(b: BookingWithDetails) {
  const name = customerName(b);
  const phone = b.customer.phone ? formatPhone(b.customer.phone) : "pas de téléphone";
  return adminMail("request_new_admin", {
    subject: `Nouvelle demande : ${b.set.name} du ${longDate(b.startDate)} au ${longDate(b.endDate)} (${name})`,
    blocks: [
      p("Bonjour,"),
      p(`${name} vient de demander une location.`),
      recap(b),
      p(`Client : ${name} · ${phone} · ${b.customer.email}`),
      p(`Message du client : ${b.customerNote?.trim() || "aucun"}`),
      p("À traiter dans l'espace de gestion : accepter, modifier la remise ou refuser."),
    ],
    button: { label: "Voir la demande", href: siteLink(`/admin/reservations/${b.id}`) },
  });
}

/** A3. Demande acceptée, au client. Version paiement en ligne sous 24 h (choix du 7 octobre 2026). */
function accepted(b: BookingWithDetails) {
  const due = b.paymentDueAt ? ` avant le ${deadline(b.paymentDueAt)}` : " dans les 24 heures";
  return customerMail("accepted", b, {
    subject: `C'est confirmé : ${b.set.name} vous attend du ${longDate(b.startDate)} au ${longDate(b.endDate)}`,
    heading: "Feu vert pour la construction !",
    blocks: [
      p(hello(b)),
      p(
        "Votre demande de location a été acceptée. Les briques sont en route, préparez vos doigts pour l'assemblage !",
      ),
      recap(b),
      p(
        `Pour finaliser, il vous reste à régler ${formatCents(total(b))} en ligne${due} : passé ce délai, la réservation est annulée et les dates redeviennent libres pour d'autres familles. La caution de ${formatCents(b.depositCents)} est une simple empreinte bancaire, débitée uniquement en cas de casse ou de perte.`,
      ),
      p("Le set vous est remis démonté, pièces triées en sachets, notice comprise."),
      p("Si quelque chose change d'ici là, prévenez-nous le plus tôt possible, un autre client attend peut-être ce set."),
    ],
    button: { label: "Régler ma réservation", href: siteLink(`/compte?payer=${b.reference}`) },
  });
}

/**
 * A3 bis. Paiement reçu, au client : la réservation est confirmée. Ajouté le 10 octobre 2026 pour
 * le « Paiement reçu » des gérants ; le paiement en ligne (module 4) enverra le même.
 */
function paid(b: BookingWithDetails) {
  const time = hour(b.pickupTime);
  return customerMail("paid", b, {
    subject: `Paiement reçu : ${b.set.name} vous est réservé du ${longDate(b.startDate)} au ${longDate(b.endDate)}`,
    heading: "Dernière brique posée, votre réservation est confirmée !",
    blocks: [
      p(hello(b)),
      p(`Nous avons bien reçu votre règlement de ${formatCents(total(b))}. Tout est prêt de notre côté !`),
      recap(b),
      p(
        `Rendez-vous le ${longDate(b.startDate)}${time ? ` vers ${time}` : ""} : ${place(b)}. Le set vous est remis démonté, pièces triées en sachets, notice comprise.`,
      ),
      p(`Un empêchement ? Prévenez-nous le plus tôt possible : répondez à cet e-mail ou ${callUs}.`),
    ],
    button: { label: "Voir ma réservation", href: siteLink("/compte") },
  });
}

/** Motif affiché au client, sauf le motif par défaut d'un refus sans précision. */
function visibleReason(b: BookingWithDetails) {
  const reason = b.cancelReason?.trim();
  if (!reason || reason === "Demande refusée par Set et Brique") return null;
  return reason;
}

/** A4. Demande refusée ou annulée par les gérants, au client. */
function refused(b: BookingWithDetails) {
  const reason = visibleReason(b);
  return customerMail("refused", b, {
    subject: `Votre demande ${b.reference} n'a pas pu être retenue`,
    heading: "Aïe, il semblerait qu'une brique bloque l'assemblage…",
    blocks: [
      p(hello(b)),
      p(
        `Nous avons étudié votre demande de location de ${b.set.name} du ${longDate(b.startDate)} au ${longDate(b.endDate)}, mais malheureusement, nous ne pouvons pas la valider pour le moment. Une pièce essentielle doit manquer dans les rouages ! Nous revenons très vite vers vous pour débloquer la situation.`,
      ),
      ...(reason ? [p(`Le motif : ${reason}`)] : []),
      p(
        `Rien n'a été débité. D'autres dates ou un autre set sont sans doute possibles : le catalogue affiche les disponibilités jour par jour, et nous sommes joignables au ${site.phone} pour en parler.`,
      ),
    ],
    button: { label: "Voir le catalogue", href: siteLink("/catalogue") },
  });
}

/** A5. Annulation par le client, aux gérants. */
function cancelledAdmin(b: BookingWithDetails) {
  const name = customerName(b);
  return adminMail("cancelled_by_customer_admin", {
    subject: `Annulation : ${b.set.name} du ${longDate(b.startDate)} au ${longDate(b.endDate)} (${name})`,
    blocks: [
      p("Bonjour,"),
      p(
        `${name} vient d'annuler sa réservation ${b.reference} pour ${b.set.name}, du ${longDate(b.startDate)} au ${longDate(b.endDate)}. Les dates sont de nouveau libres dans le catalogue.`,
      ),
    ],
    button: { label: "Voir la réservation", href: siteLink(`/admin/reservations/${b.id}`) },
  });
}

/** A5 bis. Annulation par le client, accusé au client. */
function cancelledCustomer(b: BookingWithDetails) {
  return customerMail("cancelled_by_customer", b, {
    subject: `Votre réservation ${b.reference} est annulée`,
    blocks: [
      p(hello(b)),
      p(
        `C'est noté : votre réservation de ${b.set.name} du ${longDate(b.startDate)} au ${longDate(b.endDate)} est annulée. Rien n'a été débité.`,
      ),
      p("Vous êtes les bienvenus quand vous voulez, le catalogue est toujours là."),
    ],
    button: { label: "Voir le catalogue", href: siteLink("/catalogue") },
  });
}

/** A6. Remise modifiée par les gérants, au client. */
function handoverChanged(b: BookingWithDetails) {
  const time = hour(b.pickupTime);
  const lines = [`Lieu : ${place(b)}`];
  if (time) lines.push(`Heure : vers ${time}`);
  if (b.pickupPoint?.instructions?.trim()) lines.push(b.pickupPoint.instructions.trim());
  return customerMail("handover_changed", b, {
    subject: `Remise de ${b.set.name} : nouveau rendez-vous (${b.reference})`,
    blocks: [
      p(hello(b)),
      p(`Petit changement pour la remise de ${b.set.name} le ${longDate(b.startDate)} :`),
      { type: "box", lines: ["Nouveau rendez-vous", ...lines] },
      p(
        `Les dates de location ne changent pas. Si ce nouveau rendez-vous ne vous convient pas, répondez à cet e-mail ou ${callUs}, nous trouverons autre chose.`,
      ),
    ],
    button: { label: "Voir ma réservation", href: siteLink("/compte") },
  });
}

/** A7. Set remis, au client. */
function pickedUp(b: BookingWithDetails) {
  return customerMail("picked_up", b, {
    subject: `Bonne construction ! ${b.set.name} est à rendre le ${longDate(b.endDate)}`,
    heading: "Avis de livraison : les briques ont envahi la place !",
    blocks: [
      p(hello(b)),
      p(
        "Votre set a bien été livré. Nous déclinons toute responsabilité en cas de salon transformé en zone de chantier ou de brique égarée sous un pied au milieu de la nuit ! Bon montage !",
      ),
      p("À retenir :"),
      {
        type: "list",
        items: [
          `Retour le ${longDate(b.endDate)}, au même endroit : ${place(b)}.`,
          returnInstructions(b),
          "Une pièce qui manque, une casse ? Dites-le-nous dès que vous vous en apercevez, c'est toujours plus simple que de le découvrir au retour.",
          "Envie de le garder quelques jours de plus ? Demandez une prolongation depuis votre espace, au plus tard la veille du retour : si le set est libre, on prolonge.",
        ],
      },
      p(
        `Au-delà du ${longDate(b.endDate)}, un forfait de retard de 30 € s'applique le lendemain et la caution est prélevée le surlendemain. On préfère largement que vous nous appeliez !`,
      ),
    ],
    button: { label: "Voir ma location", href: siteLink("/compte") },
  });
}

/** A8. Set rendu, au client. */
function returned(b: BookingWithDetails) {
  return customerMail("returned", b, {
    subject: `Merci ! ${b.set.name} est bien rentré`,
    heading: "Retour validé, les briques sont de nouveau imbriquées chez nous !",
    blocks: [
      p(hello(b)),
      p("Merci d'avoir loué ce set. Vos doigts ont mérité un peu de repos… avant la prochaine construction !"),
      p(
        "Nous contrôlons le set dans les 48 heures, comme prévu par les conditions de location, puis libérons votre caution.",
      ),
      p(
        `Alors, cette construction ? Si l'expérience vous a plu, un avis sur Google nous aide énormément à faire connaître Set et Brique autour de Lorient : ${site.links.googleReviews}`,
      ),
      p("Et pour la prochaine fois, le catalogue s'agrandit régulièrement."),
    ],
    button: { label: "Voir le catalogue", href: siteLink("/catalogue") },
  });
}

/** B5. Annulation pour non-paiement dans le délai (`lib/payment-expiry.ts`), au client. */
function paymentExpired(b: BookingWithDetails) {
  return customerMail("payment_expired", b, {
    subject: `Votre réservation ${b.reference} est annulée faute de règlement`,
    blocks: [
      p(hello(b)),
      p(
        `Nous n'avons pas reçu le règlement de votre réservation de ${b.set.name} du ${longDate(b.startDate)} au ${longDate(b.endDate)} dans le délai prévu : elle est annulée et les dates sont de nouveau libres.`,
      ),
      p(`Rien n'a été débité. Si vous souhaitez toujours ce set, refaites une demande depuis le catalogue, ou ${callUs}.`),
    ],
    button: { label: "Voir le catalogue", href: siteLink("/catalogue") },
  });
}

/** B1. Veille du retour (J-1), au client. */
function reminderEve(b: BookingWithDetails) {
  return customerMail("reminder_eve", b, {
    subject: `Demain, c'est le retour de ${b.set.name}`,
    heading: "Avis à notre maître constructeur : la mission arrive à son terme !",
    blocks: [
      p(hello(b)),
      p(
        "Le contrat de location de vos briques préférées se termine très bientôt. Il est temps de finaliser vos derniers chefs-d'œuvre et de préparer les briques pour leur prochain voyage.",
      ),
      p(`Petit rappel : ${b.set.name} est à rendre demain, ${longDate(b.endDate)}, au même endroit : ${place(b)}.`),
      p(returnInstructions(b)),
      p(
        "Besoin de quelques jours de plus ? Demandez une prolongation aujourd'hui depuis votre espace : si le set est libre, on prolonge sans souci.",
      ),
    ],
    button: { label: "Prolonger ma location", href: siteLink("/compte") },
  });
}

/** B2. Jour du retour (J), au client. */
function reminderDay(b: BookingWithDetails) {
  return customerMail("reminder_day", b, {
    subject: `${b.set.name} est à rendre aujourd'hui`,
    blocks: [
      p(hello(b)),
      p(`C'est aujourd'hui que ${b.set.name} revient à la maison ! Nous vous attendons au même endroit : ${place(b)}.`),
      p(`Un imprévu ? Appelez-nous au ${site.phone} avant ce soir. À partir de demain, un forfait de retard de 30 € s'applique.`),
      p("Merci, et à tout à l'heure."),
    ],
  });
}

/** B3. Retard constaté (J+1), au client. */
function reminderLate(b: BookingWithDetails) {
  return customerMail("reminder_late", b, {
    subject: `${b.set.name} n'est pas revenu : forfait de retard de 30 €`,
    heading: "Avis au maître constructeur : votre set est actuellement recherché !",
    blocks: [
      p(hello(b)),
      p(
        "La date limite est passée et nos briques ont le mal du pays. Merci de rassembler toutes les pièces et de nous les renvoyer au plus vite pour valider la fin de votre mission.",
      ),
      p(
        `Nous n'avons pas récupéré ${b.set.name}, attendu hier, ${longDate(b.endDate)}. Comme prévu dans les conditions de location, un forfait de retard de 30 € est appliqué.`,
      ),
      p(
        `Pour éviter le prélèvement de la caution (${formatCents(b.depositCents)}) demain, rapportez le set aujourd'hui au même endroit (${place(b)}), ou ${callUs} : il y a sûrement une explication, et nous préférons en parler.`,
      ),
    ],
  });
}

/* -------------------------------------------------------------------------- */
/* Prolongation d'une location (partie D du document)                         */
/* -------------------------------------------------------------------------- */

export type ExtensionEmailEvent =
  | "extension_requested"
  | "extension_accepted"
  | "extension_refused"
  | "extension_paid"
  | "extension_payment_expired";

type Extension = Pick<
  BookingExtension,
  "previousEndDate" | "newEndDate" | "extraDays" | "extraRentalCents" | "paymentDueAt" | "reason"
>;

/** Bloc de rappel de la prolongation : ancien et nouveau retour, supplément. */
function extensionRecap(b: BookingWithDetails, e: Extension): EmailBlock {
  return {
    type: "box",
    lines: [
      `${b.set.name} · réservation ${b.reference}`,
      `Retour prévu : ${longDate(e.previousEndDate)}`,
      `Nouveau retour : ${longDate(e.newEndDate)} (${plural(e.extraDays, "jour")} de plus)`,
      `Supplément : ${formatCents(e.extraRentalCents)}`,
    ],
  };
}

/** D1. Prolongation demandée, accusé au client. */
function extensionReceived(b: BookingWithDetails, e: Extension) {
  return customerMail("extension_received", b, {
    subject: `Votre demande de prolongation pour ${b.set.name} est bien arrivée (${b.reference})`,
    heading: "Message bien imbriqué !",
    blocks: [
      p(hello(b)),
      p(
        `Vous souhaitez garder ${b.set.name} un peu plus longtemps : c'est noté ! Nous vérifions que le set est libre et revenons vers vous très vite.`,
      ),
      extensionRecap(b, e),
      p(
        `Les jours demandés sont déjà bloqués pour vous. En attendant notre réponse, que vous recevrez par e-mail, le retour reste prévu le ${longDate(e.previousEndDate)}.`,
      ),
      p(`Une question, un empêchement ? Répondez simplement à cet e-mail ou ${callUs}.`),
    ],
    button: { label: "Suivre ma demande", href: siteLink("/compte") },
  });
}

/** D2. Prolongation demandée, aux gérants. */
function extensionNewAdmin(b: BookingWithDetails, e: Extension) {
  const name = customerName(b);
  const phone = b.customer.phone ? formatPhone(b.customer.phone) : "pas de téléphone";
  return adminMail("extension_new_admin", {
    subject: `Prolongation demandée : ${b.set.name} jusqu'au ${longDate(e.newEndDate)} (${name})`,
    blocks: [
      p("Bonjour,"),
      p(`${name} a le set en main et souhaite le garder plus longtemps.`),
      extensionRecap(b, e),
      p(`Client : ${name} · ${phone} · ${b.customer.email}`),
      p(
        `À traiter dans l'espace de gestion avant la fin du ${longDate(e.previousEndDate)} : passé ce jour sans réponse, la demande expire et le set reste à rendre à la date prévue.`,
      ),
    ],
    button: { label: "Voir la demande", href: siteLink(`/admin/reservations/${b.id}#prolongation`) },
  });
}

/** D3. Prolongation acceptée, au client : le supplément reste à régler. */
function extensionAccepted(b: BookingWithDetails, e: Extension) {
  const due = e.paymentDueAt ? ` avant le ${deadline(e.paymentDueAt)}` : " dans les 24 heures";
  return customerMail("extension_accepted", b, {
    subject: `Prolongation acceptée : ${b.set.name} peut rester chez vous jusqu'au ${longDate(e.newEndDate)}`,
    heading: "Feu vert pour la suite de la construction !",
    blocks: [
      p(hello(b)),
      p(`Bonne nouvelle : vous pouvez garder ${b.set.name} plus longtemps. Le chantier continue !`),
      extensionRecap(b, e),
      p(
        `Pour finaliser, il vous reste à régler ${formatCents(e.extraRentalCents)}${due} : passé ce délai, la prolongation est annulée et le set est à rendre le ${longDate(e.previousEndDate)}, comme prévu au départ.`,
      ),
    ],
    button: { label: "Régler ma prolongation", href: siteLink("/compte") },
  });
}

/** D4. Prolongation refusée, au client. */
function extensionRefused(b: BookingWithDetails, e: Extension) {
  const reason = e.reason?.trim();
  return customerMail("extension_refused", b, {
    subject: `Votre demande de prolongation n'a pas pu être retenue (${b.reference})`,
    heading: "Aïe, il semblerait qu'une brique bloque l'assemblage…",
    blocks: [
      p(hello(b)),
      p(
        `Nous aurions aimé vous laisser ${b.set.name} plus longtemps, mais nous ne pouvons malheureusement pas prolonger votre location jusqu'au ${longDate(e.newEndDate)}.`,
      ),
      ...(reason ? [p(`Le motif : ${reason}`)] : []),
      p(
        `Le retour reste donc prévu le ${longDate(e.previousEndDate)}, au même endroit : ${place(b)}. Rien n'a été débité.`,
      ),
      p(`Une question ? Répondez à cet e-mail ou ${callUs}.`),
    ],
    button: { label: "Voir ma location", href: siteLink("/compte") },
  });
}

/** D5. Supplément réglé : la prolongation est confirmée, au client. */
function extensionPaid(b: BookingWithDetails, e: Extension) {
  return customerMail("extension_paid", b, {
    subject: `C'est prolongé : ${b.set.name} est à rendre le ${longDate(e.newEndDate)}`,
    heading: "Chantier prolongé !",
    blocks: [
      p(hello(b)),
      p("Votre règlement est bien reçu, la prolongation est confirmée. Bonne suite de construction !"),
      {
        type: "box",
        lines: [
          `${b.set.name} · réservation ${b.reference}`,
          `Nouveau retour : ${longDate(e.newEndDate)}, au même endroit : ${place(b)}`,
          `Prolongation : ${plural(e.extraDays, "jour")}, ${formatCents(e.extraRentalCents)}`,
          `Location au total : ${plural(b.days, "jour")}, ${formatCents(b.rentalCents)}`,
        ],
      },
      p(returnInstructions(b)),
      p(
        `Au-delà du ${longDate(e.newEndDate)}, un forfait de retard de 30 € s'applique le lendemain. Un imprévu ? Prévenez-nous, on préfère largement en parler !`,
      ),
    ],
    button: { label: "Voir ma location", href: siteLink("/compte") },
  });
}

/** D6. Supplément non réglé dans le délai : la prolongation est annulée, au client. */
function extensionPaymentExpired(b: BookingWithDetails, e: Extension) {
  return customerMail("extension_payment_expired", b, {
    subject: `Votre prolongation est annulée faute de règlement (${b.reference})`,
    blocks: [
      p(hello(b)),
      p(
        `Nous n'avons pas reçu le règlement de la prolongation de ${b.set.name} dans le délai prévu : elle est annulée.`,
      ),
      p(
        `Le set est donc à rendre le ${longDate(e.previousEndDate)}, au même endroit : ${place(b)}. Rien n'a été débité.`,
      ),
      p(`Un imprévu ? Répondez à cet e-mail ou ${callUs}.`),
    ],
    button: { label: "Voir ma location", href: siteLink("/compte") },
  });
}

export const extensionMails: Record<ExtensionEmailEvent, (b: BookingWithDetails, e: Extension) => Mail[]> = {
  extension_requested: (b, e) => [extensionReceived(b, e), extensionNewAdmin(b, e)],
  extension_accepted: (b, e) => [extensionAccepted(b, e)],
  extension_refused: (b, e) => [extensionRefused(b, e)],
  extension_paid: (b, e) => [extensionPaid(b, e)],
  extension_payment_expired: (b, e) => [extensionPaymentExpired(b, e)],
};

export const eventMails: Record<BookingEmailEvent, (b: BookingWithDetails) => Mail[]> = {
  requested: (b) => [requestReceived(b), requestNewAdmin(b)],
  accepted: (b) => [accepted(b)],
  refused: (b) => [refused(b)],
  cancelled_by_customer: (b) => [cancelledAdmin(b), cancelledCustomer(b)],
  handover_changed: (b) => [handoverChanged(b)],
  picked_up: (b) => [pickedUp(b)],
  returned: (b) => [returned(b)],
  payment_expired: (b) => [paymentExpired(b)],
  paid: (b) => [paid(b)],
};

export const reminderMails: Record<ReminderKind, (b: BookingWithDetails) => Mail> = {
  reminder_eve: reminderEve,
  reminder_day: reminderDay,
  reminder_late: reminderLate,
};

/* -------------------------------------------------------------------------- */
/* Envoi                                                                      */
/* -------------------------------------------------------------------------- */

export async function sendBookingEmails(event: BookingEmailEvent, bookingId: string) {
  const booking = await loadBooking(bookingId);
  if (!booking) return;
  for (const mail of eventMails[event](booking)) {
    await sendEmail({ ...mail, bookingId });
  }
}

/**
 * Envoie les e-mails d'un événement après la réponse : l'action du client ou des gérants ne
 * l'attend pas, et un échec d'envoi ne la fait pas échouer. À appeler après l'écriture en base.
 */
export function queueBookingEmails(event: BookingEmailEvent, bookingId: string) {
  after(async () => {
    try {
      await sendBookingEmails(event, bookingId);
    } catch (e) {
      console.error(`[email] ${event} pour la réservation ${bookingId}`, e);
    }
  });
}

/** E-mails d'une étape de prolongation, lus sur la demande elle-même (dates et supplément figés). */
export async function sendExtensionEmails(event: ExtensionEmailEvent, extensionId: string) {
  const extension = await db.query.bookingExtensions.findFirst({ where: eq(schema.bookingExtensions.id, extensionId) });
  if (!extension) return;
  const booking = await loadBooking(extension.bookingId);
  if (!booking) return;
  for (const mail of extensionMails[event](booking, extension)) {
    await sendEmail({ ...mail, bookingId: booking.id });
  }
}

/** Comme `queueBookingEmails`, pour une étape de prolongation. */
export function queueExtensionEmails(event: ExtensionEmailEvent, extensionId: string) {
  after(async () => {
    try {
      await sendExtensionEmails(event, extensionId);
    } catch (e) {
      console.error(`[email] ${event} pour la prolongation ${extensionId}`, e);
    }
  });
}

export { loadBooking as loadBookingForEmail };
