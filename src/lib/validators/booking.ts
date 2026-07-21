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

export const bookingTypeValues = ["dalaman_kemas", "umum"] as const;

// .nullish() (bukan .optional()) — medan ni DIALIH KELUAR sepenuhnya dari
// DOM bila jenisTempahan != 'umum' (rujuk booking-form.tsx render bersyarat),
// jadi formData.get() pulangkan `null` (field terus tiada dalam FormData),
// BUKAN `undefined`. .optional() sahaja tak terima `null`, gagal parse
// dengan mesej generik "Invalid input" — disahkan bug sebenar semasa ujian
// browser (bukan andaian).
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : undefined));

export const bookingSchema = z
  .object({
    facilityId: z.string().uuid("Fasiliti wajib dipilih"),
    jenisTempahan: z.enum(bookingTypeValues, { error: "Jenis tempahan wajib dipilih" }),
    tujuan: z.string().trim().min(1, "Tujuan wajib diisi").max(500),
    anggaranPeserta: z.coerce.number().int().positive("Anggaran peserta mesti lebih daripada 0"),
    startTime: malaysiaDatetimeLocal,
    endTime: malaysiaDatetimeLocal,
    // Wajib bila jenisTempahan='umum' sahaja (disahkan .superRefine bawah) —
    // staf KEMAS hantar BAGI PIHAK penyewa luar, requestedBy tetap staf yang
    // log masuk. Kadar sewaan belum ditetapkan, di luar skop medan ni.
    penyewaNama: optionalTrimmed(255),
    penyewaOrganisasi: optionalTrimmed(255),
    penyewaTelefon: optionalTrimmed(20),
    penyewaEmel: z
      .string()
      .trim()
      .max(255)
      .nullish()
      .transform((v) => (v ? v : undefined))
      .pipe(z.string().email("Emel penyewa tidak sah").optional()),
  })
  .refine((data) => data.endTime.getTime() > data.startTime.getTime(), {
    message: "Masa tamat mesti selepas masa mula",
    path: ["endTime"],
  })
  .superRefine((data, ctx) => {
    if (data.jenisTempahan === "umum" && !data.penyewaNama) {
      ctx.addIssue({
        code: "custom",
        message: "Nama penyewa wajib diisi untuk tempahan umum",
        path: ["penyewaNama"],
      });
    }
    if (data.jenisTempahan === "umum" && !data.penyewaTelefon) {
      ctx.addIssue({
        code: "custom",
        message: "Telefon penyewa wajib diisi untuk tempahan umum",
        path: ["penyewaTelefon"],
      });
    }
  });
