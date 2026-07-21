import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venueBookings, facilities, venues } from "@/db/schema/aset";
import { users } from "@/db/schema/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  menunggu_kelulusan_pic: "secondary",
  menunggu_kelulusan_hq: "secondary",
  diluluskan: "default",
  ditolak: "destructive",
  dibatalkan: "destructive",
  perlu_pindah: "destructive",
};

export default async function TempahanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rows = await db
    .select({
      id: venueBookings.id,
      tujuan: venueBookings.tujuan,
      jenisTempahan: venueBookings.jenisTempahan,
      startTime: venueBookings.startTime,
      endTime: venueBookings.endTime,
      status: venueBookings.status,
      facilityNama: facilities.nama,
      venueNama: venues.nama,
      venueId: venues.id,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
      requestedByNama: users.nama,
    })
    .from(venueBookings)
    .innerJoin(facilities, eq(venueBookings.facilityId, facilities.id))
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .leftJoin(users, eq(venueBookings.requestedBy, users.id))
    .orderBy(venueBookings.startTime);

  // Skop pembacaan berbeza per role/assignment (rujuk rbac.ts scopeMatches) —
  // tapis di app-layer per baris. Set kecil buat masa ini (dataset booking
  // belum besar); pertimbang query SQL scoped terus kalau volum naik banyak.
  const visibleRows = [];
  for (const row of rows) {
    const allowed = await can(session.user, "read", "booking", {
      venueId: row.venueId,
      negeriId: row.negeriId,
      daerahId: row.daerahId ?? undefined,
    });
    if (allowed) visibleRows.push(row);
  }

  const dtf = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{ms.tempahan.tajuk}</h1>
        <Button asChild>
          <Link href="/aset/tempahan/baharu">{ms.tempahan.tempahBaharu}</Link>
        </Button>
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ms.tempahan.tiadaTempahan}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">{ms.aset.premis}</th>
                <th className="p-3 font-medium">{ms.tempahan.labelFasiliti}</th>
                <th className="p-3 font-medium">{ms.tempahan.labelJenisTempahan}</th>
                <th className="p-3 font-medium">{ms.tempahan.labelTujuan}</th>
                <th className="p-3 font-medium">{ms.tempahan.labelMasaMula}</th>
                <th className="p-3 font-medium">{ms.tempahan.labelMasaTamat}</th>
                <th className="p-3 font-medium">{ms.tempahan.labelStatus}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-3">{b.venueNama}</td>
                  <td className="p-3">{b.facilityNama}</td>
                  <td className="p-3">{ms.tempahan.jenisTempahan[b.jenisTempahan]}</td>
                  <td className="p-3">{b.tujuan}</td>
                  <td className="p-3">{dtf.format(b.startTime)}</td>
                  <td className="p-3">{dtf.format(b.endTime)}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_BADGE_VARIANT[b.status]}>{ms.tempahan.status[b.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
