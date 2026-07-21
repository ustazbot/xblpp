import { pgSchema } from "drizzle-orm/pg-core";

export const core = pgSchema("core");

export const userStatusEnum = core.enum("user_status", [
  "aktif",
  "digantung",
  "tidak_aktif",
]);

export const roleCodeEnum = core.enum("role_code", [
  "hq_admin",
  "admin_negeri",
  "admin_daerah",
  "pic_premis",
  "penceramah",
  "peserta",
  "pengarah",
]);

export const notificationChannelEnum = core.enum("notification_channel", [
  "in_app",
  "email",
  "telegram",
]);

export const aset = pgSchema("aset");

export const venueTypeEnum = aset.enum("venue_type", ["akademi", "ilk", "plk", "pkm"]);
export const venueStatusEnum = aset.enum("venue_status", ["aktif", "tutup"]);
export const facilityTypeEnum = aset.enum("facility_type", [
  "dewan",
  "bilik_seminar",
  "makmal",
  "asrama",
  "lain",
]);
export const facilityStatusEnum = aset.enum("facility_status", [
  "aktif",
  "maintenance",
  "tutup",
]);

// menunggu_kelulusan/diluluskan/perlu_pindah = "aktif" (pegang slot, kena
// semak EXCLUDE constraint). ditolak/dibatalkan = TIDAK pegang slot lagi
// (dikecualikan dari EXCLUDE via predicate WHERE — rujuk migration).
export const bookingStatusEnum = aset.enum("booking_status", [
  "menunggu_kelulusan",
  "diluluskan",
  "ditolak",
  "dibatalkan",
  "perlu_pindah",
]);

export const latihan = pgSchema("latihan");

export const deliveryModeEnum = latihan.enum("delivery_mode", [
  "fizikal",
  "online_live",
  "online_rakaman",
  "hybrid",
]);
export const courseStatusEnum = latihan.enum("course_status", [
  "draft",
  "published",
  "ongoing",
  "completed",
  "cancelled",
]);
export const livePlatformEnum = latihan.enum("live_platform", [
  "youtube_live",
  "zoom",
  "google_meet",
]);
