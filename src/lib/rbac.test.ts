// Self-check ringkas — jalankan: npx tsx src/lib/rbac.test.ts
import assert from "node:assert/strict";
import { can, getLandingPath, hasAdminLandingRole, type RoleAssignment } from "./rbac";

const hqAdmin: RoleAssignment = { code: "hq_admin", negeriId: null, daerahId: null, venueId: null };
const adminNegeriJohor: RoleAssignment = {
  code: "admin_negeri",
  negeriId: "negeri-johor",
  daerahId: null,
  venueId: null,
};
const picPremisA: RoleAssignment = {
  code: "pic_premis",
  negeriId: null,
  daerahId: null,
  venueId: "venue-a",
};
const peserta: RoleAssignment = { code: "peserta", negeriId: null, daerahId: null, venueId: null };

async function main() {
  // hq_admin — akses universal, tiada sekatan skop
  assert.equal(await can({ roles: [hqAdmin] }, "delete", "settings"), true);
  assert.equal(
    await can({ roles: [hqAdmin] }, "read", "venue", { negeriId: "mana-mana" }),
    true,
    "hq_admin patut lulus skop apa-apa negeri",
  );

  // admin_negeri — hanya dalam skop negeri sendiri
  assert.equal(
    await can({ roles: [adminNegeriJohor] }, "approve", "course", { negeriId: "negeri-johor" }),
    true,
  );
  assert.equal(
    await can({ roles: [adminNegeriJohor] }, "approve", "course", { negeriId: "negeri-kedah" }),
    false,
    "admin_negeri Johor tak patut lulus skop negeri lain",
  );
  assert.equal(
    await can({ roles: [adminNegeriJohor] }, "approve", "course"),
    true,
    "tanpa target skop = tak disekat (semakan skop dibuat di caller/query filter)",
  );

  // peserta — tiada akses "settings" langsung
  assert.equal(await can({ roles: [peserta] }, "read", "settings"), false);
  assert.equal(await can({ roles: [peserta] }, "create", "registration"), true);

  // pic_premis — skop venue
  assert.equal(
    await can({ roles: [picPremisA] }, "approve", "booking", { venueId: "venue-a" }),
    true,
  );
  assert.equal(
    await can({ roles: [picPremisA] }, "approve", "booking", { venueId: "venue-b" }),
    false,
  );

  // pengguna dengan >1 role — lulus jika MANA-MANA satu benarkan
  assert.equal(await can({ roles: [peserta, picPremisA] }, "update", "venue"), true);

  // getLandingPath / hasAdminLandingRole
  assert.equal(getLandingPath([hqAdmin]), "/");
  assert.equal(getLandingPath([peserta]), "/latihan/portal");
  assert.equal(hasAdminLandingRole([picPremisA]), true);
  assert.equal(hasAdminLandingRole([peserta]), false);

  console.log("rbac.test.ts: semua assertion lulus");
}

main();
