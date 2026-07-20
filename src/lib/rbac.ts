// Permission matrix dikodkan sebagai data (bukan if-else bersepah) — rujuk
// PRD v2.0 Seksyen 8 (matrix role) + xBLPP-Struktur-Repo-Schema.md Seksyen 4.

export type Action = "create" | "read" | "update" | "delete" | "approve" | "export";

export type Resource =
  | "course"
  | "registration"
  | "venue"
  | "facility"
  | "booking"
  | "trainer"
  | "user"
  | "repository"
  | "competency"
  | "report"
  | "settings"
  | "import";

export type RoleCode =
  | "hq_admin"
  | "admin_negeri"
  | "admin_daerah"
  | "pic_premis"
  | "penceramah"
  | "peserta"
  | "pengarah";

// Satu baris user_roles (skop assignment). null pada mana-mana dimensi = tiada
// sekatan pada dimensi tu (cth. hq_admin: semua null = akses nasional).
export interface RoleAssignment {
  code: RoleCode;
  negeriId: string | null;
  daerahId: string | null;
  venueId: string | null;
}

export interface ScopeTarget {
  negeriId?: string;
  daerahId?: string;
  venueId?: string;
}

const ALL: Action[] = ["create", "read", "update", "delete", "approve", "export"];

// "admin/PIC + Pengarah" → landing dua pintu selepas login; peserta/penceramah → portal.
// Rujuk PRD Seksyen 7 (autentikasi) + Struktur Seksyen 4 (role-based redirect).
export const ADMIN_LANDING_ROLES: RoleCode[] = [
  "hq_admin",
  "admin_negeri",
  "admin_daerah",
  "pic_premis",
  "pengarah",
];
export const PORTAL_ROLES: RoleCode[] = ["penceramah", "peserta"];

// Nota terjemahan dari matrix prosa PRD ke Resource/Action konkrit — pemetaan
// interpretif, bukan copy verbatim (jadual asal guna frasa macam "Manage all",
// "View + approve tertentu"). Semak semula bila business rules Fasa 1 dibina.
export const PERMISSIONS: Record<RoleCode, Partial<Record<Resource, Action[]>>> = {
  hq_admin: {
    course: ALL,
    registration: ["read", "approve", "export"],
    venue: ALL,
    facility: ALL,
    booking: ALL,
    trainer: ["create", "read", "update", "delete"],
    user: ["create", "read", "update", "delete"],
    repository: ["create", "read", "update", "delete"],
    competency: ["create", "read", "update", "delete", "export"],
    report: ["read", "export"],
    settings: ["create", "read", "update", "delete"],
    import: ["create", "read"],
  },
  admin_negeri: {
    course: ["create", "read", "update", "approve", "export"],
    registration: ["read", "approve", "export"],
    venue: ALL,
    facility: ALL,
    booking: ALL,
    trainer: ["create", "read", "update", "delete"],
    user: ["read", "update"],
    repository: ["create", "read", "update", "delete"],
    competency: ["create", "read", "update", "delete", "export"],
    report: ["read", "export"],
    import: ["create", "read"],
  },
  admin_daerah: {
    course: ["create", "read", "update"],
    registration: ["read", "update"],
    venue: ["read"],
    facility: ["read"],
    booking: ["create", "read"],
    trainer: ["read"],
    user: ["read", "update"],
    repository: ["create", "read"],
    competency: ["read", "update"],
    report: ["read", "export"],
  },
  pic_premis: {
    course: ["read"],
    venue: ["read", "update"],
    facility: ["read", "update"],
    booking: ["read", "approve"],
    trainer: ["read"],
    user: ["read"],
    repository: ["create", "read"],
    report: ["read", "export"],
  },
  penceramah: {
    course: ["read"],
    venue: ["read"],
    facility: ["read"],
    trainer: ["read", "update"], // profil sendiri — semak pemilikan (userId) di call-site
    user: ["read", "update"], // profil sendiri
    repository: ["create", "read"],
    competency: ["read"], // rekod sendiri
    report: ["read"], // rekod sendiri
  },
  peserta: {
    course: ["read"],
    registration: ["create", "read"], // permohonan sendiri
    venue: ["read"],
    facility: ["read"],
    trainer: ["read"],
    user: ["read", "update"], // profil sendiri
    repository: ["read"], // hanya published — tapis di query, bukan di sini
    competency: ["read"], // rekod sendiri
    report: ["read"], // rekod sendiri
  },
  pengarah: {
    course: ["read", "approve"],
    registration: ["read", "approve"],
    venue: ["read"],
    facility: ["read"],
    booking: ["read"],
    trainer: ["read"],
    user: ["read"],
    repository: ["read"],
    competency: ["read"], // staf bawahan — tapis di query
    report: ["read", "export"],
  },
};

function scopeMatches(assignment: RoleAssignment, target?: ScopeTarget): boolean {
  if (!target) return true;
  if (assignment.venueId && target.venueId && assignment.venueId !== target.venueId) {
    return false;
  }
  if (assignment.daerahId && target.daerahId && assignment.daerahId !== target.daerahId) {
    return false;
  }
  if (assignment.negeriId && target.negeriId && assignment.negeriId !== target.negeriId) {
    return false;
  }
  return true;
}

// Async ikut sketch dokumen struktur (Seksyen 4) — bersedia untuk semakan skop
// masa depan yang perlu query DB (cth. venue milik daerah mana), walaupun
// pemeriksaan semasa 100% dari data session (tiada await sebenar buat masa ini).
export async function can(
  user: { roles: RoleAssignment[] },
  action: Action,
  resource: Resource,
  target?: ScopeTarget,
): Promise<boolean> {
  for (const assignment of user.roles) {
    const allowed = PERMISSIONS[assignment.code]?.[resource];
    if (allowed?.includes(action) && scopeMatches(assignment, target)) {
      return true;
    }
  }
  return false;
}

export function getLandingPath(roles: RoleAssignment[]): string {
  const hasAdminRole = roles.some((r) => ADMIN_LANDING_ROLES.includes(r.code));
  return hasAdminRole ? "/" : "/latihan/portal";
}

export function hasAdminLandingRole(roles: RoleAssignment[]): boolean {
  return roles.some((r) => ADMIN_LANDING_ROLES.includes(r.code));
}

export function isHqAdmin(roles: RoleAssignment[]): boolean {
  return roles.some((r) => r.code === "hq_admin");
}
