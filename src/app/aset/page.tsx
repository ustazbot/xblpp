import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, inArray, gt, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isHqAdmin } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities, venueBookings } from "@/db/schema/aset";
import { users, auditLogs } from "@/db/schema/core";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";
import { daysUntil } from "@/lib/booking-rules";

const PENDING_STATUSES = ["menunggu_kelulusan_pic", "menunggu_kelulusan_hq"] as const;
const ACTIVE_UPCOMING_STATUSES = [
  "menunggu_kelulusan_pic",
  "menunggu_kelulusan_hq",
  "diluluskan",
  "perlu_pindah",
] as const;
const ACTIVITY_ENTITY_TYPES = ["venue", "facility", "venue_booking"] as const;
const ACTIVITY_LIMIT = 10;

function SlaBadge({ slaDeadline, now }: { slaDeadline: Date; now: Date }) {
  const hari = daysUntil(slaDeadline, now);
  if (hari < 0) {
    return <Badge variant="destructive">{ms.aset.dashboard.slaTertunggak(Math.abs(hari))}</Badge>;
  }
  if (hari === 0) {
    return <Badge variant="destructive">{ms.aset.dashboard.slaHariIni}</Badge>;
  }
  return <Badge variant="secondary">{ms.aset.dashboard.slaLagi(hari)}</Badge>;
}

export default async function AsetHubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isHq = isHqAdmin(session.user.roles);
  const picAssignments = session.user.roles.filter((r) => r.code === "pic_premis");
  const isPic = picAssignments.length > 0;

  if (!isHq && !isPic) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">{ms.nav.aset}</h1>
        <div className="flex gap-3">
          <Link href="/aset/premis" className="rounded border px-4 py-2 text-sm hover:bg-muted/50">
            {ms.aset.premis}
          </Link>
          <Link href="/aset/tempahan" className="rounded border px-4 py-2 text-sm hover:bg-muted/50">
            {ms.aset.tempahan}
          </Link>
        </div>
      </div>
    );
  }

  // hq_admin = nasional (tiada sekatan venue). pic_premis dengan mana-mana
  // assignment venueId=null pun dianggap nasional (padan semantik
  // scopeMatches rbac.ts) — kes tepi, PIC biasanya sentiasa ada venueId.
  const nasional = isHq || picAssignments.some((r) => r.venueId === null);
  const scopedVenueIds = nasional
    ? null
    : (picAssignments.map((r) => r.venueId).filter((v): v is string => v !== null));

  const now = new Date();

  const venueRows = await db
    .select({ id: venues.id, nama: venues.nama })
    .from(venues)
    .where(nasional ? undefined : inArray(venues.id, scopedVenueIds!));

  const facilityRows = await db
    .select({
      id: facilities.id,
      nama: facilities.nama,
      status: facilities.status,
      maintenanceUntil: facilities.maintenanceUntil,
      venueId: facilities.venueId,
      venueNama: venues.nama,
    })
    .from(facilities)
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(nasional ? undefined : inArray(facilities.venueId, scopedVenueIds!));

  const facilityIds = facilityRows.map((f) => f.id);

  const activeBookings = facilityIds.length
    ? await db
        .select({ facilityId: venueBookings.facilityId })
        .from(venueBookings)
        .where(
          and(
            inArray(venueBookings.facilityId, facilityIds),
            inArray(venueBookings.status, ACTIVE_UPCOMING_STATUSES),
            gt(venueBookings.endTime, now),
          ),
        )
    : [];
  const facilitiesInUse = new Set(activeBookings.map((b) => b.facilityId)).size;

  const pendingBookings = facilityIds.length
    ? await db
        .select({
          id: venueBookings.id,
          tujuan: venueBookings.tujuan,
          status: venueBookings.status,
          slaDeadline: venueBookings.slaDeadline,
          facilityId: venueBookings.facilityId,
          requesterNama: users.nama,
        })
        .from(venueBookings)
        .leftJoin(users, eq(venueBookings.requestedBy, users.id))
        .where(
          and(
            inArray(venueBookings.facilityId, facilityIds),
            inArray(venueBookings.status, PENDING_STATUSES),
          ),
        )
        .orderBy(venueBookings.slaDeadline)
    : [];

  const facilityById = new Map(facilityRows.map((f) => [f.id, f]));
  const maintenanceFacilities = facilityRows.filter((f) => f.status === "maintenance");

  const activityScopeIds = nasional
    ? null
    : [...scopedVenueIds!, ...facilityIds, ...pendingBookings.map((b) => b.id)];

  const recentActivity = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      createdAt: auditLogs.createdAt,
      userNama: users.nama,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(
      nasional
        ? inArray(auditLogs.entityType, ACTIVITY_ENTITY_TYPES)
        : and(inArray(auditLogs.entityType, ACTIVITY_ENTITY_TYPES), inArray(auditLogs.entityId, activityScopeIds!)),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(ACTIVITY_LIMIT);

  const dtf = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{ms.aset.dashboard.tajuk}</h1>
        <div className="flex gap-2">
          <Link href="/aset/premis" className="rounded border px-3 py-1.5 text-sm hover:bg-muted/50">
            {ms.aset.premis}
          </Link>
          <Link href="/aset/tempahan" className="rounded border px-3 py-1.5 text-sm hover:bg-muted/50">
            {ms.aset.tempahan}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{ms.aset.dashboard.jumlahPremis}</p>
          <p className="text-2xl font-semibold">{venueRows.length}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{ms.aset.dashboard.jumlahFasiliti}</p>
          <p className="text-2xl font-semibold">{facilityRows.length}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{ms.aset.dashboard.kadarPenggunaan}</p>
          <p className="text-2xl font-semibold">
            {facilityRows.length ? Math.round((facilitiesInUse / facilityRows.length) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground">
            {ms.aset.dashboard.kadarPenggunaanNota(facilitiesInUse, facilityRows.length)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{ms.aset.dashboard.tempahanMenungguKelulusan}</h2>
        {pendingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ms.aset.dashboard.tiadaMenungguKelulusan}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">{ms.tempahan.labelFasiliti}</th>
                  <th className="p-3 font-medium">{ms.tempahan.labelTujuan}</th>
                  <th className="p-3 font-medium">{ms.tempahan.labelPemohon}</th>
                  <th className="p-3 font-medium">{ms.tempahan.labelStatus}</th>
                  <th className="p-3 font-medium">SLA</th>
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">
                      <Link href={`/aset/tempahan/${b.id}`} className="underline underline-offset-2">
                        {facilityById.get(b.facilityId)?.nama ?? "—"}
                      </Link>
                    </td>
                    <td className="p-3">{b.tujuan}</td>
                    <td className="p-3">{b.requesterNama ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{ms.tempahan.status[b.status]}</Badge>
                    </td>
                    <td className="p-3">
                      <SlaBadge slaDeadline={b.slaDeadline} now={now} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{ms.aset.dashboard.statusPenyelenggaraan}</h2>
        {maintenanceFacilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ms.aset.dashboard.tiadaPenyelenggaraan}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {maintenanceFacilities.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <Badge variant="secondary">{ms.aset.statusFasiliti.maintenance}</Badge>
                <span className="font-medium">{f.nama}</span>
                <span className="text-muted-foreground">— {f.venueNama}</span>
                {f.maintenanceUntil && (
                  <span className="text-muted-foreground">
                    ({ms.aset.labelMaintenanceUntil}: {f.maintenanceUntil})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{ms.aset.dashboard.aktivitiTerkini}</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ms.aset.dashboard.tiadaAktiviti}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recentActivity.map((a) => (
              <li key={a.id} className="text-sm text-muted-foreground">
                <span className="text-foreground">{a.userNama ?? "Sistem"}</span> — {a.action} —{" "}
                {dtf.format(a.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
