import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities } from "@/db/schema/aset";
import { negeri, daerah, users } from "@/db/schema/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";
import { hasManageRole } from "../manage-roles";

export default async function PremisDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [venue] = await db
    .select({
      id: venues.id,
      nama: venues.nama,
      jenis: venues.jenis,
      alamat: venues.alamat,
      status: venues.status,
      googleMapsUrl: venues.googleMapsUrl,
      negeriNama: negeri.nama,
      daerahNama: daerah.nama,
      picNama: users.nama,
    })
    .from(venues)
    .leftJoin(negeri, eq(venues.negeriId, negeri.id))
    .leftJoin(daerah, eq(venues.daerahId, daerah.id))
    .leftJoin(users, eq(venues.picUserId, users.id))
    .where(eq(venues.id, params.id))
    .limit(1);

  if (!venue) notFound();

  const facilityRows = await db
    .select()
    .from(facilities)
    .where(eq(facilities.venueId, params.id))
    .orderBy(facilities.nama);

  const canManage =
    hasManageRole(session.user.roles) &&
    (await can(session.user, "update", "venue", { venueId: params.id }));
  const canCreateFacility =
    hasManageRole(session.user.roles) && (await can(session.user, "create", "facility"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{venue.nama}</h1>
          <p className="text-sm text-muted-foreground">
            {ms.aset.jenisVenue[venue.jenis]} · {venue.negeriNama}
            {venue.daerahNama ? ` · ${venue.daerahNama}` : ""}
          </p>
        </div>
        {canManage && (
          <Button asChild variant="outline">
            <Link href={`/aset/premis/${venue.id}/edit`}>{ms.aset.editPremis}</Link>
          </Button>
        )}
      </div>

      <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{ms.aset.labelAlamat}</dt>
        <dd>{venue.alamat}</dd>
        <dt className="text-muted-foreground">{ms.aset.labelPic}</dt>
        <dd>{venue.picNama ?? "—"}</dd>
        <dt className="text-muted-foreground">{ms.aset.labelStatus}</dt>
        <dd>
          <Badge variant={venue.status === "aktif" ? "default" : "secondary"}>
            {ms.aset.statusVenue[venue.status]}
          </Badge>
        </dd>
        {venue.googleMapsUrl && (
          <>
            <dt className="text-muted-foreground">{ms.aset.labelGoogleMaps}</dt>
            <dd>
              <a
                href={venue.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {venue.googleMapsUrl}
              </a>
            </dd>
          </>
        )}
      </dl>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{ms.aset.senaraiFasiliti}</h2>
          {canCreateFacility && (
            <Button asChild size="sm">
              <Link href={`/aset/premis/${venue.id}/fasiliti/baharu`}>{ms.aset.tambahFasiliti}</Link>
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">{ms.aset.labelNama}</th>
                <th className="p-3 font-medium">{ms.aset.labelJenis}</th>
                <th className="p-3 font-medium">{ms.aset.labelKapasiti}</th>
                <th className="p-3 font-medium">{ms.aset.labelStatus}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {facilityRows.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-3 font-medium">{f.nama}</td>
                  <td className="p-3">{ms.aset.jenisFasiliti[f.jenis]}</td>
                  <td className="p-3">{f.kapasiti}</td>
                  <td className="p-3">
                    <Badge variant={f.status === "aktif" ? "default" : "secondary"}>
                      {ms.aset.statusFasiliti[f.status]}
                    </Badge>
                    {f.status === "maintenance" && f.maintenanceUntil && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {ms.aset.labelMaintenanceUntil}: {f.maintenanceUntil}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {canManage && (
                      <Link
                        href={`/aset/premis/${venue.id}/fasiliti/${f.id}/edit`}
                        className="text-sm underline-offset-2 hover:underline"
                      >
                        {ms.aset.kemaskini}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
