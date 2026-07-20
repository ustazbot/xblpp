import { headers } from "next/headers";
import { db } from "@/db";
import { auditLogs } from "@/db/schema/core";

export interface AuditLogParams {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

// Ambil IP client sebenar dari X-Forwarded-For (Caddy set header ni bila
// proxy) — ambil entri PERTAMA (client asal, bukan hop proksi seterusnya).
// Pure function supaya boleh diuji tanpa mock headers().
export function parseClientIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}

// Helper log mutasi — WAJIB setiap mutation (PRD v2.0 Seksyen 17 #3).
// Urutan panggilan di caller: zod parse → can() check → mutasi → logAudit().
// Append-only ikut schema (core.audit_logs tiada UPDATE/DELETE) — jangan
// tulis fungsi update/delete untuk table ni.
export async function logAudit(params: AuditLogParams): Promise<void> {
  const headerList = await headers();
  const ip = parseClientIp(headerList.get("x-forwarded-for"));

  await db.insert(auditLogs).values({
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
    ip,
  });
}
