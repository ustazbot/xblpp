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
  bookingTypeEnum,
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
  status: bookingStatusEnum("status").notNull().default("menunggu_kelulusan_pic"),
  // dalaman_kemas (Pengarah/Penolong Pengarah/Pegawai KEMAS, role sedia ada)
  // vs umum (pihak luar, staf hantar bagi pihak — rujuk penyewa* bawah).
  jenisTempahan: bookingTypeEnum("jenis_tempahan").notNull(),
  // Wajib diisi HANYA bila jenisTempahan='umum' — disahkan app-layer (Zod
  // .superRefine), bukan DB constraint (kadar sewaan/struktur penuh tempahan
  // umum belum ditetapkan, di luar skop Fasa 1a — rujuk enums.ts).
  penyewaNama: varchar("penyewa_nama", { length: 255 }),
  penyewaOrganisasi: varchar("penyewa_organisasi", { length: 255 }),
  penyewaTelefon: varchar("penyewa_telefon", { length: 20 }),
  penyewaEmel: varchar("penyewa_emel", { length: 255 }),
  // Kumpulan sama bila dijana dari recurring booking (Langkah 4) — null untuk
  // tempahan tunggal biasa.
  recurringGroupId: uuid("recurring_group_id"),
  // >12 bulan ke hadapan — flag perhatian tambahan semasa semakan HQ (Langkah
  // 5), BUKAN lagi penentu SIAPA meluluskan (kelulusan dwi-peringkat PIC->HQ
  // WAJIB untuk semua tempahan tak kira tarikh, keputusan 2026-07-21).
  requiresAdminNegeriApproval: boolean("requires_admin_negeri_approval")
    .notNull()
    .default(false),
  // Kelulusan DWI-PERINGKAT berurutan: PIC dulu, baru HQ. Tolak pada
  // MANA-MANA peringkat guna rejectedBy/rejectedAt sahaja (tak perlu
  // rejectedStage berasingan — status sendiri dah cukup rekod peringkat mana
  // yang tolak, sebab tak boleh sampai peringkat HQ kalau PIC dah tolak).
  picApprovedBy: uuid("pic_approved_by").references(() => users.id),
  picApprovedAt: timestamp("pic_approved_at", { withTimezone: true }),
  hqApprovedBy: uuid("hq_approved_by").references(() => users.id),
  hqApprovedAt: timestamp("hq_approved_at", { withTimezone: true }),
  rejectedBy: uuid("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  // Langkah 9 — pembatalan. cancelledBy/At ditambah eksplisit (bukan hanya
  // audit_logs) sama pattern picApprovedBy/At, hqApprovedBy/At, rejectedBy/At
  // atas — perlu paparan terus pada butiran tempahan + query laporan
  // penggunaan tanpa JOIN audit_logs.
  cancellationReason: text("cancellation_reason"),
  cancelledBy: uuid("cancelled_by").references(() => users.id),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  // SLA kelulusan 3 hari bekerja — dikira semasa create, disemak cron
  // eskalasi (Langkah 5).
  slaDeadline: timestamp("sla_deadline", { withTimezone: true }).notNull(),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
