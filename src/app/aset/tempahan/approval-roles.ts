import type { ApprovalStage } from "@/lib/booking-rules";

// Fasa 1a keputusan skop (Langkah 5, flag untuk semakan semula — bukan
// disahkan user, hipotesis munasabah paling dekat dgn "PIC dan HQ" per
// maklumat Langkah 3.5): kelulusan PERINGKAT PIC = PIC venue berkenaan
// (scoped) ATAU hq_admin (override, "Manage all"). Peringkat HQ = hq_admin
// SAHAJA — walaupun admin_negeri/admin_daerah ada permission "approve"
// blanket dalam rbac.ts (Fasa 0), sekatan tambahan app-layer ni sengaja
// lebih ketat, sama pattern macam Langkah 2 (manage-roles.ts). Fail
// berasingan (bukan dalam actions.ts "use server") supaya boleh diimport
// server component (page.tsx) untuk gate visibility butang lulus/tolak.
export function canApprovePicStage(roles: { code: string; venueId: string | null }[], venueId: string): boolean {
  return roles.some(
    (r) => r.code === "hq_admin" || (r.code === "pic_premis" && (r.venueId === null || r.venueId === venueId)),
  );
}

export function canApproveHqStage(roles: { code: string }[]): boolean {
  return roles.some((r) => r.code === "hq_admin");
}

export function canActOnStage(
  stage: ApprovalStage,
  roles: { code: string; venueId: string | null }[],
  venueId: string,
): boolean {
  return stage === "pic" ? canApprovePicStage(roles, venueId) : canApproveHqStage(roles);
}
