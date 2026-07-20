import { uuid, varchar, text, integer, jsonb, timestamp, time, date } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { negeri, users } from "./core";
import { facilities } from "./aset";
import {
  latihan,
  deliveryModeEnum,
  courseStatusEnum,
  livePlatformEnum,
} from "./enums";

// Sistem 2 — Pengurusan Latihan. Skop Langkah 8 (Fasa 0): course_categories +
// courses + course_sessions (minimum untuk kaitkan sesi fizikal ke facility)
// sahaja, cukup untuk seed 5 kursus contoh. registrations, waiting_list,
// attendance, trainers, quizzes ditangguh ke Fasa 1b/1c ikut roadmap asal —
// rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 2.3.
//
// search_vector ditangguh ke Fasa 1a/1b bersama fungsi carian sebenar.

export const courseCategories = latihan.table("course_categories", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  nama: varchar("nama", { length: 150 }).notNull(),
});

export const courses = latihan.table("courses", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  courseCode: varchar("course_code", { length: 30 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  categoryId: uuid("category_id").references(() => courseCategories.id),
  description: text("description"),
  durationHours: integer("duration_hours").notNull(),
  maxParticipants: integer("max_participants").notNull(),
  minAttendancePct: integer("min_attendance_pct").notNull().default(80),
  targetCriteria: jsonb("target_criteria"),
  cpdPoints: integer("cpd_points").notNull().default(0),
  status: courseStatusEnum("status").notNull().default("draft"),
  // null = nasional (bukan terhad satu negeri)
  negeriId: uuid("negeri_id").references(() => negeri.id),
  deliveryMode: deliveryModeEnum("delivery_mode").notNull(),
  passingScore: integer("passing_score"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const courseSessions = latihan.table("course_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  tarikh: date("tarikh").notNull(),
  masaMula: time("masa_mula"),
  masaTamat: time("masa_tamat"),
  // FK rentas schema (latihan → aset) DIBENARKAN — rujuk Seksyen 2 doc struktur.
  facilityId: uuid("facility_id").references(() => facilities.id),
  deliveryMode: deliveryModeEnum("delivery_mode").notNull(),
  livePlatform: livePlatformEnum("live_platform"),
  liveUrl: text("live_url"),
  recordingUrl: text("recording_url"),
  qrSecret: varchar("qr_secret", { length: 64 }),
});
