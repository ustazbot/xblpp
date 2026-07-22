// Self-check ringkas — jalankan: npx tsx src/lib/validators/user.test.ts
// Tiada framework; assert-based, fail cepat kalau skop wajib ikut role pecah.
import assert from "node:assert/strict";
import { createUserSchema } from "./user";

const base = { nama: "Ahmad", email: "ahmad@example.com" };
const negeriId = "019f8082-d360-7144-af41-e9b969c00acf";
const daerahId = "019f8082-d360-7144-af41-e9b969c00ace";
const venueId = "019f8082-d360-7144-af41-e9b969c00acd";

// hq_admin/penceramah/peserta/pengarah — tiada skop wajib
assert.equal(createUserSchema.safeParse({ ...base, roleCode: "hq_admin" }).success, true);
assert.equal(createUserSchema.safeParse({ ...base, roleCode: "penceramah" }).success, true);

// admin_negeri — negeriId wajib
assert.equal(createUserSchema.safeParse({ ...base, roleCode: "admin_negeri" }).success, false);
assert.equal(
  createUserSchema.safeParse({ ...base, roleCode: "admin_negeri", negeriId }).success,
  true,
);

// admin_daerah — negeriId DAN daerahId wajib
assert.equal(createUserSchema.safeParse({ ...base, roleCode: "admin_daerah", negeriId }).success, false);
assert.equal(
  createUserSchema.safeParse({ ...base, roleCode: "admin_daerah", negeriId, daerahId }).success,
  true,
);

// pic_premis — venueId wajib
assert.equal(createUserSchema.safeParse({ ...base, roleCode: "pic_premis" }).success, false);
assert.equal(
  createUserSchema.safeParse({ ...base, roleCode: "pic_premis", venueId }).success,
  true,
);

// email tak sah ditolak
assert.equal(
  createUserSchema.safeParse({ ...base, email: "bukan-emel", roleCode: "hq_admin" }).success,
  false,
);

console.log("user.test.ts: semua ujian lulus");
