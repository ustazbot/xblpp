-- Kelulusan dwi-peringkat (PIC -> HQ) + jenis tempahan dalaman/umum.
-- Keputusan 2026-07-21, rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 7.
--
-- Ditulis TANGAN (--custom, bukan drizzle-kit generate auto) — drizzle-kit
-- punya rename-detection perlukan prompt interaktif (TTY tiada dalam sesi
-- automasi ni). Snapshot drizzle/meta/0005_snapshot.json dikemaskini tangan
-- sekali supaya `generate` akan datang diff betul. Sama pattern precedent
-- macam EXCLUDE constraint (migration 0004, Langkah 1).
--
-- Disahkan xblpp_staging + xblpp_prod aset.venue_bookings KOSONG (0 baris
-- sebenar — semua ujian Langkah 3 tempatan sahaja) sebelum migration ni
-- ditulis, jadi ADD COLUMN ... NOT NULL terus (tiada DEFAULT) selamat.
--
-- ⚠ Enum booking_status DICIPTA SEMULA (CREATE TYPE baharu + USING cast +
-- DROP + RENAME) — BUKAN `ALTER TYPE ... ADD VALUE` + rujuk nilai baharu tu
-- terus. Postgres larang guna nilai enum baharu dalam TRANSAKSI SAMA ia
-- ditambah, DAN drizzle-kit migrate() SENTIASA gabung SEMUA migration
-- pending dalam SATU transaksi (rujuk node_modules/drizzle-orm/pg-core/
-- dialect.cjs — session.transaction() bungkus keseluruhan array migrations,
-- bukan per-fail). Cubaan asal (ADD VALUE dalam fail ni + guna value tu
-- dalam fail 0006 berasingan) GANTUNG/gagal diam semasa ujian sebenar —
-- pemisahan fail TAK cukup, drizzle-kit tetap gabung kedua-dua migration
-- dalam satu transaksi bila kedua-dua "pending" serentak (macam kes staging/
-- prod: 0005+0006 kedua-dua belum applied). Recreate-type elak sekatan ni
-- sepenuhnya sebab CREATE TYPE tiada sekatan macam ADD VALUE.

-- Enum booking_type baharu — tiada sekatan (CREATE TYPE penuh dari awal).
CREATE TYPE "aset"."booking_type" AS ENUM('dalaman_kemas', 'umum');
--> statement-breakpoint

-- Enum booking_status: cipta type BAHARU dengan set nilai penuh (nama semula
-- 'menunggu_kelulusan' -> 'menunggu_kelulusan_pic' + tambah
-- 'menunggu_kelulusan_hq').
CREATE TYPE "aset"."booking_status_new" AS ENUM(
	'menunggu_kelulusan_pic',
	'menunggu_kelulusan_hq',
	'diluluskan',
	'ditolak',
	'dibatalkan',
	'perlu_pindah'
);
--> statement-breakpoint

-- Drop constraint EXCLUDE dulu — predicate dia rujuk kolum status, kena
-- lepaskan sebelum tukar jenis kolum tu.
ALTER TABLE "aset"."venue_bookings" DROP CONSTRAINT "venue_bookings_no_overlap";
--> statement-breakpoint

-- Tukar kolum status ke type baharu — USING cast petakan nilai lama (kalau
-- ada baris sebenar) ke label baharu yang padan.
ALTER TABLE "aset"."venue_bookings"
	ALTER COLUMN "status" DROP DEFAULT,
	ALTER COLUMN "status" TYPE "aset"."booking_status_new"
	USING (
		CASE status::text
			WHEN 'menunggu_kelulusan' THEN 'menunggu_kelulusan_pic'
			ELSE status::text
		END
	)::"aset"."booking_status_new";
--> statement-breakpoint

DROP TYPE "aset"."booking_status";
--> statement-breakpoint

ALTER TYPE "aset"."booking_status_new" RENAME TO "booking_status";
--> statement-breakpoint

ALTER TABLE "aset"."venue_bookings" ALTER COLUMN "status" SET DEFAULT 'menunggu_kelulusan_pic';
--> statement-breakpoint

-- Constraint EXCLUDE sedia semula — predicate kemas kini termasuk
-- 'menunggu_kelulusan_hq' (peringkat baharu, MESTI turut pegang slot,
-- masih aktif/belum lulus penuh).
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_no_overlap"
	EXCLUDE USING gist (
		facility_id WITH =,
		tstzrange(start_time, end_time, '[)') WITH &&
	) WHERE (status IN ('menunggu_kelulusan_pic', 'menunggu_kelulusan_hq', 'diluluskan', 'perlu_pindah'));
--> statement-breakpoint

-- approved_by/approved_at sedia ada -> kelulusan PERINGKAT PIC (rename,
-- bukan drop+add — lebih tepat niat walaupun tiada data sebenar lagi).
ALTER TABLE "aset"."venue_bookings" RENAME COLUMN "approved_by" TO "pic_approved_by";
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" RENAME COLUMN "approved_at" TO "pic_approved_at";
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" RENAME CONSTRAINT "venue_bookings_approved_by_users_id_fk" TO "venue_bookings_pic_approved_by_users_id_fk";
--> statement-breakpoint

-- Kelulusan peringkat HQ (baharu).
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "hq_approved_by" uuid;
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "hq_approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_hq_approved_by_users_id_fk" FOREIGN KEY ("hq_approved_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Rekod siapa/tarikh tolak (mana-mana peringkat — status sendiri dah cukup
-- rekod peringkat mana tolak, sebab mustahil sampai peringkat HQ kalau PIC
-- dah tolak dulu, jadi tiada kolum rejected_stage berasingan).
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "rejected_by" uuid;
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "rejected_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Jenis tempahan (wajib) + medan penyewa (tempahan umum sahaja, nullable —
-- wajib diisi bila jenis='umum' disahkan app-layer Zod, BUKAN DB constraint,
-- sebab struktur penuh/kadar sewaan tempahan umum belum ditetapkan).
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "jenis_tempahan" "aset"."booking_type" NOT NULL;
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "penyewa_nama" varchar(255);
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "penyewa_organisasi" varchar(255);
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "penyewa_telefon" varchar(20);
--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "penyewa_emel" varchar(255);
