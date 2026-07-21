// escalate-sla.ts — cari tempahan menunggu kelulusan yang tertunggak SLA
// (3 hari bekerja, booking-rules.ts) dan maklumkan SEMUA hq_admin. Setiap
// tempahan dieskalasi SEKALI sahaja (escalatedAt ditanda selepas notify),
// bukan diulang tiap-tiap run.
//
// Cron dicadangkan (VPS, pattern sama backup.sh): setiap jam.
//   0 * * * *  cd /opt/xblpp/app && DATABASE_URL=... npx tsx scripts/escalate-sla.ts
// (bukan dipasang automatik oleh skrip ni — pemasangan crontab VPS sebenar
// perlu SSH + pengesahan berasingan, sama macam backup.sh Langkah 9 Fasa 0.)
//
// Jalankan tempatan: set -a && source .env.local && set +a && npx tsx scripts/escalate-sla.ts
//
// NOTA: logAudit() (src/lib/audit.ts) bergantung next/headers (konteks
// request Next.js) — TAK boleh dipanggil dari script standalone ni. Insert
// audit_logs terus di bawah (userId=null = tindakan sistem, bukan manusia).

import { eq, and, inArray, lt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { venueBookings, facilities, venues } from "@/db/schema/aset";
import { users, roles, userRoles, auditLogs } from "@/db/schema/core";
import { notify } from "@/lib/notify";
import { ms } from "@/constants/ms";
import { currentApprovalStage, daysUntil } from "@/lib/booking-rules";

const PENDING_STATUSES = ["menunggu_kelulusan_pic", "menunggu_kelulusan_hq"] as const;
const STAGE_LABEL: Record<string, string> = { pic: "PIC", hq: "HQ" };

async function hqAdminUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.code, "hq_admin"));
  return rows.map((r) => r.id);
}

async function main() {
  const now = new Date();

  const overdue = await db
    .select({
      id: venueBookings.id,
      status: venueBookings.status,
      slaDeadline: venueBookings.slaDeadline,
      facilityNama: facilities.nama,
      venueNama: venues.nama,
    })
    .from(venueBookings)
    .innerJoin(facilities, eq(venueBookings.facilityId, facilities.id))
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(
      and(
        inArray(venueBookings.status, PENDING_STATUSES),
        lt(venueBookings.slaDeadline, now),
        isNull(venueBookings.escalatedAt),
      ),
    );

  if (overdue.length === 0) {
    console.log("Eskalasi SLA: tiada tempahan tertunggak.");
    return;
  }

  const hqAdminIds = await hqAdminUserIds();

  for (const booking of overdue) {
    const stage = currentApprovalStage(booking.status);
    if (!stage) continue;
    const hariTertunggak = Math.abs(daysUntil(booking.slaDeadline, now));

    for (const userId of hqAdminIds) {
      await notify({
        userId,
        title: ms.tempahan.notifikasi.eskalasiTajuk,
        body: ms.tempahan.notifikasi.eskalasiBadan(
          booking.facilityNama,
          booking.venueNama,
          STAGE_LABEL[stage],
          hariTertunggak,
        ),
        link: `/aset/tempahan/${booking.id}`,
        channels: ["in_app", "email"],
      });
    }

    await db.update(venueBookings).set({ escalatedAt: now }).where(eq(venueBookings.id, booking.id));

    await db.insert(auditLogs).values({
      userId: null,
      action: "booking_sla_escalated",
      entityType: "venue_booking",
      entityId: booking.id,
      before: { escalatedAt: null },
      after: { escalatedAt: now },
      ip: null,
    });
  }

  console.log(`Eskalasi SLA: ${overdue.length} tempahan dieskalasi kepada ${hqAdminIds.length} hq_admin.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Eskalasi SLA gagal:", err);
    process.exit(1);
  });
