ALTER TABLE "core"."users" DROP CONSTRAINT "users_no_pekerja_unique";--> statement-breakpoint
ALTER TABLE "core"."users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."user_service_records" ADD COLUMN "ic_hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."users" DROP COLUMN "no_pekerja";--> statement-breakpoint
ALTER TABLE "core"."user_service_records" ADD CONSTRAINT "user_service_records_ic_hash_unique" UNIQUE("ic_hash");