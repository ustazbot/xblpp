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

// Kelulusan DWI-PERINGKAT berurutan (keputusan 2026-07-21, rujuk
// xBLPP-Struktur-Repo-Schema.md Seksyen 7): PIC lulus dulu -> HQ lulus ->
// diluluskan penuh. Tolak pada MANA-MANA peringkat terus tamat (tak
// tunggu peringkat lain). menunggu_kelulusan_pic/menunggu_kelulusan_hq/
// diluluskan/perlu_pindah = "aktif" (pegang slot, kena semak EXCLUDE
// constraint). ditolak/dibatalkan = TIDAK pegang slot lagi (dikecualikan
// dari EXCLUDE via predicate WHERE — rujuk migration).
export const bookingStatusEnum = aset.enum("booking_status", [
  "menunggu_kelulusan_pic",
  "menunggu_kelulusan_hq",
  "diluluskan",
  "ditolak",
  "dibatalkan",
  "perlu_pindah",
]);

// dalaman_kemas: tempahan antara Bahagian HQ/KEMAS Negeri/KEMAS Daerah
// (Pengarah/Penolong Pengarah/Pegawai KEMAS — role sedia ada hq_admin/
// admin_negeri/admin_daerah/pengarah, BUKAN role RBAC baharu, keputusan
// 2026-07-21). umum: tempahan terbuka pihak luar KEMAS, kadar sewaan
// BELUM ditetapkan (di luar skop Fasa 1a, medan penyewa* sengaja tiada
// kadar/harga buat masa ini) — staf KEMAS log masuk hantar BAGI PIHAK
// penyewa (bukan portal awam self-service, sistem ni tiada pendaftaran awam).
export const bookingTypeEnum = aset.enum("booking_type", ["dalaman_kemas", "umum"]);

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
