import { z } from "zod";

export const venueTypeValues = ["akademi", "ilk", "plk", "pkm"] as const;
export const venueStatusValues = ["aktif", "tutup"] as const;
export const facilityTypeValues = ["dewan", "bilik_seminar", "makmal", "asrama", "lain"] as const;
export const facilityStatusValues = ["aktif", "maintenance", "tutup"] as const;

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.string().uuid().optional());

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.string().url().max(500).optional());

export const venueSchema = z.object({
  nama: z.string().trim().min(1, "Nama premis wajib diisi").max(255),
  jenis: z.enum(venueTypeValues),
  alamat: z.string().trim().min(1, "Alamat wajib diisi").max(500),
  negeriId: z.string().uuid("Negeri wajib dipilih"),
  daerahId: optionalUuid,
  googleMapsUrl: optionalUrl,
  picUserId: optionalUuid,
  status: z.enum(venueStatusValues),
});

export const facilitySchema = z.object({
  nama: z.string().trim().min(1, "Nama fasiliti wajib diisi").max(150),
  jenis: z.enum(facilityTypeValues),
  kapasiti: z.coerce.number().int().positive("Kapasiti mesti lebih daripada 0"),
  status: z.enum(facilityStatusValues),
  // Tarikh jangka tamat penyelenggaraan — hanya relevan bila status=
  // "maintenance", tapi disimpan tanpa syarat (harmless kalau status lain,
  // elak kerumitan superRefine untuk medan pilihan semata-mata).
  maintenanceUntil: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null)),
});
