import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Énumérations                                                        */
/* ------------------------------------------------------------------ */

export const setStatus = pgEnum("set_status", ["draft", "published", "archived"]);

/** Notices papier ou numériques (dans ce cas, avertir le client qu'il faut un accès internet). */
export const instructionType = pgEnum("instruction_type", ["paper", "digital"]);

export const copyCondition = pgEnum("copy_condition", [
  "new",
  "very_good",
  "good",
  "worn",
]);

/**
 * Statut saisi par les gérants. Les états « en location » et « en battement »
 * ne sont pas stockés : ils se déduisent des réservations en cours.
 */
export const copyStatus = pgEnum("copy_status", [
  "available",
  "maintenance",
  "retired",
]);

export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "picked_up",
  "returned",
  "cancelled",
]);

export const bookingActor = pgEnum("booking_actor", ["customer", "admin", "system"]);

/* ------------------------------------------------------------------ */
/* Colonnes communes                                                   */
/* ------------------------------------------------------------------ */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    addressLine: text("address_line"),
    postalCode: text("postal_code"),
    city: text("city"),
    adminNote: text("admin_note"),
    ...timestamps,
  },
  (t) => [uniqueIndex("customers_clerk_user_id_idx").on(t.clerkUserId)],
);

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

/**
 * Forfaits de location : un prix par jour, choisi par set.
 * Le forfait marqué `isDefault` s'applique aux sets sans forfait explicite.
 */
export const ratePlans = pgTable("rate_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  priceCentsPerDay: integer("price_cents_per_day").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/**
 * Un set = un article du catalogue, tel que présenté au client.
 * Il peut regrouper plusieurs boîtes officielles (`setNumbers`).
 * Les exemplaires physiques sont dans `set_copies`.
 */
export const sets = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    /** Null = forfait par défaut. */
    ratePlanId: uuid("rate_plan_id").references(() => ratePlans.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    /** Marque de la boîte : LEGO le plus souvent, parfois une autre (PANTASY…). */
    brand: text("brand").notNull().default("LEGO"),
    /** Numéros officiels des boîtes qui composent l'article (souvent un seul, parfois 2 ou 3). */
    setNumbers: text("set_numbers")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    theme: text("theme"),
    description: text("description"),
    /** Commentaire libre affiché au client sur la fiche, en plus de la description. */
    publicNote: text("public_note"),
    pieces: integer("pieces"),
    minifigCount: integer("minifig_count"),
    /** Nombre de notices, toutes boîtes confondues. */
    instructionCount: integer("instruction_count"),
    instructionType: instructionType("instruction_type").notNull().default("paper"),
    /** Dimensions une fois construit, texte libre (« L 84 × l 56 × H 21 cm »). */
    dimensions: text("dimensions"),
    /** Temps de montage estimé, texte libre (« 8 à 10 h »). */
    buildTime: text("build_time"),
    ageMin: integer("age_min"),
    /** Poids du set complet, en grammes. Usage interne (vérification au retour), jamais affiché. */
    weightGrams: integer("weight_grams"),
    depositCents: integer("deposit_cents").notNull().default(0),
    /** Jours de battement entre deux locations. Null = réglage global `turnaround_days`. */
    turnaroundDays: integer("turnaround_days"),
    status: setStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("sets_slug_idx").on(t.slug),
    index("sets_rate_plan_id_idx").on(t.ratePlanId),
  ],
);

export const setImages = pgTable(
  "set_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("set_images_set_id_idx").on(t.setId)],
);

export const setCopies = pgTable(
  "set_copies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    condition: copyCondition("condition").notNull().default("very_good"),
    status: copyStatus("status").notNull().default("available"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("set_copies_set_id_idx").on(t.setId)],
);

/* ------------------------------------------------------------------ */
/* Logistique                                                          */
/* ------------------------------------------------------------------ */

export const pickupPoints = pgTable("pickup_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  instructions: text("instructions"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Périodes sans remise ni retour possibles (vacances, absence). */
export const blackoutPeriods = pgTable("blackout_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  createdAt: timestamps.createdAt,
});

/* ------------------------------------------------------------------ */
/* Réservations                                                        */
/* ------------------------------------------------------------------ */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Code court lisible, ex. SB-4K7Q2, donné au client. */
    reference: text("reference").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "restrict" }),
    /** Exemplaire attribué. Null tant que la réservation n'est pas confirmée. */
    copyId: uuid("copy_id").references(() => setCopies.id, { onDelete: "set null" }),
    pickupPointId: uuid("pickup_point_id").references(() => pickupPoints.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: integer("days").notNull(),
    status: bookingStatus("status").notNull().default("pending_payment"),
    rentalCents: integer("rental_cents").notNull(),
    depositCents: integer("deposit_cents").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    /** Empreinte bancaire pour la caution, capturée seulement en cas de casse ou perte. */
    stripeDepositPaymentIntentId: text("stripe_deposit_payment_intent_id"),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookings_reference_idx").on(t.reference),
    index("bookings_customer_id_idx").on(t.customerId),
    index("bookings_copy_dates_idx").on(t.copyId, t.startDate, t.endDate),
    index("bookings_set_dates_idx").on(t.setId, t.startDate, t.endDate),
  ],
);

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    actor: bookingActor("actor").notNull(),
    fromStatus: bookingStatus("from_status"),
    toStatus: bookingStatus("to_status"),
    message: text("message"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("booking_events_booking_id_idx").on(t.bookingId)],
);

/* ------------------------------------------------------------------ */
/* Contenu éditable du site                                            */
/* ------------------------------------------------------------------ */

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  author: text("author").notNull(),
  text: text("text").notNull(),
  source: text("source"),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const pressArticles = pgTable("press_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  outlet: text("outlet").notNull(),
  title: text("title").notNull(),
  quote: text("quote"),
  url: text("url").notNull(),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Réglages et textes modifiables depuis l'admin, une ligne par clé. */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamps.updatedAt,
});

/* ------------------------------------------------------------------ */
/* Relations (pour les requêtes Drizzle `with`)                        */
/* ------------------------------------------------------------------ */

export const customersRelations = relations(customers, ({ many }) => ({
  bookings: many(bookings),
}));

export const ratePlansRelations = relations(ratePlans, ({ many }) => ({
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one, many }) => ({
  ratePlan: one(ratePlans, { fields: [sets.ratePlanId], references: [ratePlans.id] }),
  images: many(setImages),
  copies: many(setCopies),
  bookings: many(bookings),
}));

export const setImagesRelations = relations(setImages, ({ one }) => ({
  set: one(sets, { fields: [setImages.setId], references: [sets.id] }),
}));

export const setCopiesRelations = relations(setCopies, ({ one, many }) => ({
  set: one(sets, { fields: [setCopies.setId], references: [sets.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  set: one(sets, { fields: [bookings.setId], references: [sets.id] }),
  copy: one(setCopies, { fields: [bookings.copyId], references: [setCopies.id] }),
  pickupPoint: one(pickupPoints, {
    fields: [bookings.pickupPointId],
    references: [pickupPoints.id],
  }),
  events: many(bookingEvents),
}));

export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, { fields: [bookingEvents.bookingId], references: [bookings.id] }),
}));

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Customer = typeof customers.$inferSelect;
export type Set = typeof sets.$inferSelect;
export type SetImage = typeof setImages.$inferSelect;
export type SetCopy = typeof setCopies.$inferSelect;
export type RatePlan = typeof ratePlans.$inferSelect;
export type PickupPoint = typeof pickupPoints.$inferSelect;
export type BlackoutPeriod = typeof blackoutPeriods.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type PressArticle = typeof pressArticles.$inferSelect;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type InstructionType = (typeof instructionType.enumValues)[number];
