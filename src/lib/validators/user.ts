import { z } from "zod";
import { roleCodeEnum } from "@/db/schema/enums";

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.string().uuid().optional());

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createUserSchema = z
  .object({
    nama: z.string().trim().min(1, "Nama wajib diisi").max(150),
    email: z.string().trim().toLowerCase().email("E-mel tidak sah").max(255),
    telefon: optionalTrimmed(20),
    jawatan: optionalTrimmed(100),
    roleCode: z.enum(roleCodeEnum.enumValues),
    negeriId: optionalUuid,
    daerahId: optionalUuid,
    venueId: optionalUuid,
  })
  // Skop wajib ikut role — rujuk rbac.ts scopeMatches() untuk logik akses
  // sepadan (assignment.negeriId/daerahId/venueId null = akses nasional,
  // bukan "wajib kosong"). Role lain (hq_admin/penceramah/peserta/pengarah)
  // tak perlukan skop — user_roles simpan null, akses nasional/tanpa skop.
  .superRefine((data, ctx) => {
    if (data.roleCode === "admin_negeri" && !data.negeriId) {
      ctx.addIssue({ code: "custom", message: "Negeri wajib dipilih untuk role Admin Negeri", path: ["negeriId"] });
    }
    if (data.roleCode === "admin_daerah" && (!data.negeriId || !data.daerahId)) {
      ctx.addIssue({ code: "custom", message: "Negeri dan daerah wajib dipilih untuk role Admin Daerah", path: ["daerahId"] });
    }
    if (data.roleCode === "pic_premis" && !data.venueId) {
      ctx.addIssue({ code: "custom", message: "Premis wajib dipilih untuk role PIC Premis", path: ["venueId"] });
    }
  });
