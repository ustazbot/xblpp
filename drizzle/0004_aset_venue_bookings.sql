CREATE TYPE "aset"."booking_status" AS ENUM('menunggu_kelulusan', 'diluluskan', 'ditolak', 'dibatalkan', 'perlu_pindah');--> statement-breakpoint
CREATE TABLE "aset"."venue_bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"tujuan" text NOT NULL,
	"anggaran_peserta" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" "aset"."booking_status" DEFAULT 'menunggu_kelulusan' NOT NULL,
	"recurring_group_id" uuid,
	"requires_admin_negeri_approval" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"cancellation_reason" text,
	"sla_deadline" timestamp with time zone NOT NULL,
	"escalated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "aset"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Pengecualian manual (sama pattern extension pgcrypto, Fasa 0 Langkah 3) —
-- Drizzle pg-core tiada builder untuk tstzrange/EXCLUDE, rujuk
-- xBLPP-Struktur-Repo-Schema.md Seksyen 7 (Fasa 1a Langkah 1).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- Conflict detection peringkat fasiliti: dua tempahan AKTIF (belum
-- ditolak/dibatalkan) pada fasiliti sama TIDAK boleh bertindih. Range
-- '[)' — mula termasuk, tamat tak termasuk — elak tempahan bersebelahan
-- (cth. 10-11am + 11am-12pm) silap dikira bertindih pada saat sempadan.
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_no_overlap"
	EXCLUDE USING gist (
		facility_id WITH =,
		tstzrange(start_time, end_time, '[)') WITH &&
	) WHERE (status IN ('menunggu_kelulusan', 'diluluskan', 'perlu_pindah'));