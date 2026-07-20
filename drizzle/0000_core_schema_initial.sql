-- pgcrypto: enkripsi field IC (core.user_service_records) — rujuk PRD v3.1 Seksyen 7.1.
-- Pengecualian didokumentasi: drizzle-kit tiada builder "extension" native.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE SCHEMA "core";
--> statement-breakpoint
CREATE TYPE "core"."notification_channel" AS ENUM('in_app', 'email', 'telegram');--> statement-breakpoint
CREATE TYPE "core"."role_code" AS ENUM('hq_admin', 'admin_negeri', 'admin_daerah', 'pic_premis', 'penceramah', 'peserta', 'pengarah');--> statement-breakpoint
CREATE TYPE "core"."user_status" AS ENUM('aktif', 'digantung', 'tidak_aktif');--> statement-breakpoint
CREATE TABLE "core"."audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."daerah" (
	"id" uuid PRIMARY KEY NOT NULL,
	"negeri_id" uuid NOT NULL,
	"nama" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."import_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"entity" varchar(100) NOT NULL,
	"total_rows" integer NOT NULL,
	"success_rows" integer NOT NULL,
	"failed_rows" jsonb,
	"imported_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."negeri" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kod" varchar(10) NOT NULL,
	"nama" varchar(100) NOT NULL,
	CONSTRAINT "negeri_kod_unique" UNIQUE("kod")
);
--> statement-breakpoint
CREATE TABLE "core"."notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"link" varchar(255),
	"channel" "core"."notification_channel" NOT NULL,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" "core"."role_code" NOT NULL,
	"nama" varchar(100) NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "core"."settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "core"."user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"negeri_id" uuid,
	"daerah_id" uuid,
	"venue_id" uuid
);
--> statement-breakpoint
CREATE TABLE "core"."user_service_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ic_encrypted" "bytea" NOT NULL,
	"ic_last4" varchar(4) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "user_service_records_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "core"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"no_pekerja" varchar(20) NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"nama" varchar(150) NOT NULL,
	"telefon" varchar(20),
	"avatar_path" varchar(255),
	"negeri_id" uuid,
	"daerah_id" uuid,
	"bahagian" varchar(100),
	"jawatan" varchar(100),
	"is_penceramah_luar" boolean DEFAULT false NOT NULL,
	"status" "core"."user_status" DEFAULT 'aktif' NOT NULL,
	"force_password_change" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	CONSTRAINT "users_no_pekerja_unique" UNIQUE("no_pekerja"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "core"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."daerah" ADD CONSTRAINT "daerah_negeri_id_negeri_id_fk" FOREIGN KEY ("negeri_id") REFERENCES "core"."negeri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."import_logs" ADD CONSTRAINT "import_logs_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "core"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."user_roles" ADD CONSTRAINT "user_roles_negeri_id_negeri_id_fk" FOREIGN KEY ("negeri_id") REFERENCES "core"."negeri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."user_roles" ADD CONSTRAINT "user_roles_daerah_id_daerah_id_fk" FOREIGN KEY ("daerah_id") REFERENCES "core"."daerah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."user_service_records" ADD CONSTRAINT "user_service_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."user_service_records" ADD CONSTRAINT "user_service_records_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."users" ADD CONSTRAINT "users_negeri_id_negeri_id_fk" FOREIGN KEY ("negeri_id") REFERENCES "core"."negeri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."users" ADD CONSTRAINT "users_daerah_id_daerah_id_fk" FOREIGN KEY ("daerah_id") REFERENCES "core"."daerah"("id") ON DELETE no action ON UPDATE no action;