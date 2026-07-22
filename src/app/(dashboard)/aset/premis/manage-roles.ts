// Fasa 1a keputusan skop (disahkan 2026-07-21, rujuk xBLPP-Struktur-Repo-
// Schema.md Seksyen 7): create/edit venue+facility HANYA hq_admin/pic_premis
// fasa ni. admin_negeri/admin_daerah MASIH ada permission penuh dalam
// rbac.ts (ikut PRD asal) — sekatan ni tambahan di atas can(), bukan
// gantian. Fail berasingan (bukan dalam actions.ts "use server") supaya
// boleh diimport server component (page.tsx) untuk gate visibility link.
const MANAGE_ROLES = new Set(["hq_admin", "pic_premis"]);

export function hasManageRole(roles: { code: string }[]): boolean {
  return roles.some((r) => MANAGE_ROLES.has(r.code));
}
