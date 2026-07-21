ALTER TABLE "aset"."venue_bookings" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "aset"."venue_bookings" ADD CONSTRAINT "venue_bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;