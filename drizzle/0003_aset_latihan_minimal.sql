CREATE SCHEMA "aset";
--> statement-breakpoint
CREATE SCHEMA "latihan";
--> statement-breakpoint
CREATE TYPE "latihan"."course_status" AS ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "latihan"."delivery_mode" AS ENUM('fizikal', 'online_live', 'online_rakaman', 'hybrid');--> statement-breakpoint
CREATE TYPE "aset"."facility_status" AS ENUM('aktif', 'maintenance', 'tutup');--> statement-breakpoint
CREATE TYPE "aset"."facility_type" AS ENUM('dewan', 'bilik_seminar', 'makmal', 'asrama', 'lain');--> statement-breakpoint
CREATE TYPE "latihan"."live_platform" AS ENUM('youtube_live', 'zoom', 'google_meet');--> statement-breakpoint
CREATE TYPE "aset"."venue_status" AS ENUM('aktif', 'tutup');--> statement-breakpoint
CREATE TYPE "aset"."venue_type" AS ENUM('akademi', 'ilk', 'plk', 'pkm');--> statement-breakpoint
CREATE TABLE "aset"."facilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venue_id" uuid NOT NULL,
	"nama" varchar(150) NOT NULL,
	"jenis" "aset"."facility_type" NOT NULL,
	"kapasiti" integer NOT NULL,
	"amenities" jsonb,
	"status" "aset"."facility_status" DEFAULT 'aktif' NOT NULL,
	"maintenance_until" date
);
--> statement-breakpoint
CREATE TABLE "aset"."venues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nama" varchar(255) NOT NULL,
	"jenis" "aset"."venue_type" NOT NULL,
	"alamat" varchar(500) NOT NULL,
	"negeri_id" uuid NOT NULL,
	"daerah_id" uuid,
	"google_maps_url" varchar(500),
	"pic_user_id" uuid,
	"thumbnail_path" varchar(255),
	"gallery" jsonb,
	"status" "aset"."venue_status" DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "latihan"."course_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nama" varchar(150) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "latihan"."course_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"tarikh" date NOT NULL,
	"masa_mula" time,
	"masa_tamat" time,
	"facility_id" uuid,
	"delivery_mode" "latihan"."delivery_mode" NOT NULL,
	"live_platform" "latihan"."live_platform",
	"live_url" text,
	"recording_url" text,
	"qr_secret" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "latihan"."courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_code" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category_id" uuid,
	"description" text,
	"duration_hours" integer NOT NULL,
	"max_participants" integer NOT NULL,
	"min_attendance_pct" integer DEFAULT 80 NOT NULL,
	"target_criteria" jsonb,
	"cpd_points" integer DEFAULT 0 NOT NULL,
	"status" "latihan"."course_status" DEFAULT 'draft' NOT NULL,
	"negeri_id" uuid,
	"delivery_mode" "latihan"."delivery_mode" NOT NULL,
	"passing_score" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "courses_course_code_unique" UNIQUE("course_code")
);
--> statement-breakpoint
ALTER TABLE "aset"."facilities" ADD CONSTRAINT "facilities_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "aset"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."venues" ADD CONSTRAINT "venues_negeri_id_negeri_id_fk" FOREIGN KEY ("negeri_id") REFERENCES "core"."negeri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."venues" ADD CONSTRAINT "venues_daerah_id_daerah_id_fk" FOREIGN KEY ("daerah_id") REFERENCES "core"."daerah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."venues" ADD CONSTRAINT "venues_pic_user_id_users_id_fk" FOREIGN KEY ("pic_user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "latihan"."course_sessions" ADD CONSTRAINT "course_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "latihan"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "latihan"."course_sessions" ADD CONSTRAINT "course_sessions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "aset"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "latihan"."courses" ADD CONSTRAINT "courses_category_id_course_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "latihan"."course_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "latihan"."courses" ADD CONSTRAINT "courses_negeri_id_negeri_id_fk" FOREIGN KEY ("negeri_id") REFERENCES "core"."negeri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "latihan"."courses" ADD CONSTRAINT "courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;