import { z } from "zod";

export const aduanKategoriValues = [
  "awam_sivil",
  "elektrikal",
  "mekanikal",
  "paip_saliran",
  "keselamatan",
  "landskap_kebersihan",
] as const;
export const aduanKeterukanValues = ["kritikal", "major", "minor"] as const;

export const createAduanSchema = z.object({
  facilityId: z.string().uuid("Fasiliti wajib dipilih"),
  kategori: z.enum(aduanKategoriValues),
  keterukan: z.enum(aduanKeterukanValues),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(1000),
});
