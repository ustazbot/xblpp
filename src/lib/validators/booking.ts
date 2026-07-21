import { z } from "zod";

const MALAYSIA_OFFSET = "+08:00";

// <input type="datetime-local"> hantar "YYYY-MM-DDTHH:mm" TANPA offset zon
// waktu — parse terus guna `new Date()` anggap waktu TEMPATAN SERVER (VPS
// jalan UTC, rujuk backup.sh), bukan Malaysia. Sambung offset eksplisit
// supaya "10:00" yang pemohon taip sentiasa bermaksud 10 pagi Malaysia,
// tak kira zon waktu server yang jalankan Node.
const malaysiaDatetimeLocal = z
  .string()
  .min(1, "Wajib diisi")
  .transform((v) => new Date(`${v}${MALAYSIA_OFFSET}`))
  .pipe(z.date({ error: "Tarikh/masa tidak sah" }));

export const bookingSchema = z
  .object({
    facilityId: z.string().uuid("Fasiliti wajib dipilih"),
    tujuan: z.string().trim().min(1, "Tujuan wajib diisi").max(500),
    anggaranPeserta: z.coerce.number().int().positive("Anggaran peserta mesti lebih daripada 0"),
    startTime: malaysiaDatetimeLocal,
    endTime: malaysiaDatetimeLocal,
  })
  .refine((data) => data.endTime.getTime() > data.startTime.getTime(), {
    message: "Masa tamat mesti selepas masa mula",
    path: ["endTime"],
  });
