import { uuid, varchar, integer, jsonb, date, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { negeri, daerah, users } from "./core";
import { aset, venueTypeEnum, venueStatusEnum, facilityTypeEnum, facilityStatusEnum } from "./enums";

// Sistem 1 — Pengurusan Aset & Premis. Skop Langkah 8 (Fasa 0): venues +
// facilities sahaja, cukup untuk seed data premis sebenar. venue_bookings +
// constraint EXCLUDE conflict-detection (btree_gist) ditangguh ke Fasa 1a
// bila business logic tempahan sebenar dibina — rujuk xBLPP-Struktur-Repo-
// Schema.md Seksyen 2.2.
//
// search_vector (full-text search, GIN index) turut ditangguh ke Fasa 1a
// bersama fungsi carian sebenar — bukan diperlukan untuk seed/demo data.

export const venues = aset.table("venues", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  nama: varchar("nama", { length: 255 }).notNull(),
  jenis: venueTypeEnum("jenis").notNull(),
  alamat: varchar("alamat", { length: 500 }).notNull(),
  negeriId: uuid("negeri_id")
    .notNull()
    .references(() => negeri.id),
  // WP Kuala Lumpur/Labuan/Putrajaya tiada daerah — nullable.
  daerahId: uuid("daerah_id").references(() => daerah.id),
  googleMapsUrl: varchar("google_maps_url", { length: 500 }),
  picUserId: uuid("pic_user_id").references(() => users.id),
  thumbnailPath: varchar("thumbnail_path", { length: 255 }),
  gallery: jsonb("gallery"),
  status: venueStatusEnum("status").notNull().default("aktif"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facilities = aset.table("facilities", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id),
  nama: varchar("nama", { length: 150 }).notNull(),
  jenis: facilityTypeEnum("jenis").notNull(),
  kapasiti: integer("kapasiti").notNull(),
  amenities: jsonb("amenities"),
  status: facilityStatusEnum("status").notNull().default("aktif"),
  maintenanceUntil: date("maintenance_until"),
});
