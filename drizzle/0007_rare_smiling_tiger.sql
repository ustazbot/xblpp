CREATE TYPE "aset"."aduan_kategori" AS ENUM('awam_sivil', 'elektrikal', 'mekanikal', 'paip_saliran', 'keselamatan', 'landskap_kebersihan');--> statement-breakpoint
CREATE TYPE "aset"."aduan_keterukan" AS ENUM('kritikal', 'major', 'minor');--> statement-breakpoint
CREATE TYPE "aset"."aduan_status" AS ENUM('dilaporkan', 'dalam_tindakan', 'selesai');--> statement-breakpoint
CREATE TABLE "aset"."aduan_kerosakan" (
	"id" uuid PRIMARY KEY NOT NULL,
	"facility_id" uuid NOT NULL,
	"kategori" "aset"."aduan_kategori" NOT NULL,
	"keterukan" "aset"."aduan_keterukan" NOT NULL,
	"keterangan" text NOT NULL,
	"status" "aset"."aduan_status" DEFAULT 'dilaporkan' NOT NULL,
	"dilaporkan_oleh" uuid NOT NULL,
	"dilaporkan_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"tindakan_oleh" uuid,
	"tindakan_pada" timestamp with time zone,
	"selesai_pada" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "aset"."aduan_kerosakan" ADD CONSTRAINT "aduan_kerosakan_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "aset"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."aduan_kerosakan" ADD CONSTRAINT "aduan_kerosakan_dilaporkan_oleh_users_id_fk" FOREIGN KEY ("dilaporkan_oleh") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset"."aduan_kerosakan" ADD CONSTRAINT "aduan_kerosakan_tindakan_oleh_users_id_fk" FOREIGN KEY ("tindakan_oleh") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;