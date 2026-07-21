import { uuid, varchar, text, integer, boolean, jsonb, date, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { negeri, daerah, users } from "./core";
import {
  aset,
  venueTypeEnum,
  venueStatusEnum,
  facilityTypeEnum,
  facilityStatusEnum,
  bookingStatusEnum,
} from "./enums";

// Sistem 1 — Pengurusan Aset & Premis. Skop Langkah 8 (Fasa 0): venues +
// facilities sahaja, cukup untuk seed data premis sebenar. venue_bookings +
// constraint EXCLUDE conflict-detection (btree_gist) dibina Fasa 1a Langkah 1
// — rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 2.2 + Seksyen 7.
//
// search_vector (full-text search, GIN index) turut ditangguh — bukan
// diperlukan untuk seed/demo data atau tempahan.

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

// EXCLUDE constraint (btree_gist, conflict detection peringkat fasiliti)
// ditambah MANUAL pada migration digenerate — Drizzle pg-core tiada builder
// untuk tstzrange/EXCLUDE. Pengecualian didokumentasi, sama pattern macam
// extension pgcrypto (Langkah 3, Fasa 0). Rujuk drizzle/0004_*.sql.
export const venueBookings = aset.table("venue_bookings", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  tujuan: text("tujuan").notNull(),
  anggaranPeserta: integer("anggaran_peserta").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  status: bookingStatusEnum("status").notNull().default("menunggu_kelulusan"),
  // Kumpulan sama bila dijana dari recurring booking (Langkah 4) — null untuk
  // tempahan tunggal biasa.
  recurringGroupId: uuid("recurring_group_id"),
  // >12 bulan ke hadapan perlu kelulusan Admin Negeri (bukan PIC) — rujuk
  // PRD Modul 2 business rules.
  requiresAdminNegeriApproval: boolean("requires_admin_negeri_approval")
    .notNull()
    .default(false),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  cancellationReason: text("cancellation_reason"),
  // SLA kelulusan 3 hari bekerja — dikira semasa create, disemak cron
  // eskalasi (Langkah 5).
  slaDeadline: timestamp("sla_deadline", { withTimezone: true }).notNull(),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
