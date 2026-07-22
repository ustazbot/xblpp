import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities, aduanKerosakan } from "@/db/schema/aset";
import { negeri, daerah, users } from "@/db/schema/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";
import { hasManageRole } from "../manage-roles";
import { AduanForm } from "./aduan-form";
import { AduanStatusActions } from "./aduan-status-actions";

const KETERUKAN_BADGE_VARIANT = {
  kritikal: "rejected",
  major: "pending",
  minor: "draft",
} as const;

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

  const facilityIds = facilityRows.map((f) => f.id);
  const aduanRows = facilityIds.length
    ? await db
        .select()
        .from(aduanKerosakan)
        .where(inArray(aduanKerosakan.facilityId, facilityIds))
        .orderBy(desc(aduanKerosakan.dilaporkanPada))
    : [];
  const facilityNameById = new Map(facilityRows.map((f) => [f.id, f.nama]));
  const canReportAduan = await can(session.user, "create", "aduan", { venueId: params.id });
  const canManageAduan = await can(session.user, "update", "aduan", { venueId: params.id });

  const dtf = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

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
                    <Link
                      href={`/aset/premis/${venue.id}/fasiliti/${f.id}/kalendar`}
                      className="text-sm underline-offset-2 hover:underline"
                    >
                      {ms.tempahan.kalendar.lihatKalendar}
                    </Link>
                    {canManage && (
                      <Link
                        href={`/aset/premis/${venue.id}/fasiliti/${f.id}/edit`}
                        className="ml-3 text-sm underline-offset-2 hover:underline"
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

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{ms.aset.aduan.tajuk}</h2>

        {canReportAduan && facilityRows.length > 0 && (
          <AduanForm venueId={venue.id} facilityList={facilityRows.map((f) => ({ id: f.id, nama: f.nama }))} />
        )}

        {aduanRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ms.aset.aduan.tiadaAduan}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">{ms.aset.aduan.labelFasiliti}</th>
                  <th className="p-3 font-medium">{ms.aset.aduan.labelKategori}</th>
                  <th className="p-3 font-medium">{ms.aset.aduan.labelKeterukan}</th>
                  <th className="p-3 font-medium">{ms.tempahan.labelStatus}</th>
                  <th className="p-3 font-medium">{ms.aset.aduan.lajurTarikhLapor}</th>
                  <th className="p-3 font-medium">{ms.aset.aduan.lajurTarikhSelesai}</th>
                  {canManageAduan && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {aduanRows.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">{facilityNameById.get(a.facilityId) ?? "—"}</td>
                    <td className="p-3">{ms.aset.aduan.kategori[a.kategori]}</td>
                    <td className="p-3">
                      <Badge variant={KETERUKAN_BADGE_VARIANT[a.keterukan]}>
                        {ms.aset.aduan.keterukan[a.keterukan]}
                      </Badge>
                    </td>
                    <td className="p-3">{ms.aset.aduan.status[a.status]}</td>
                    <td className="p-3">{dtf.format(a.dilaporkanPada)}</td>
                    <td className="p-3">{a.selesaiPada ? dtf.format(a.selesaiPada) : "—"}</td>
                    {canManageAduan && (
                      <td className="p-3">
                        <AduanStatusActions venueId={venue.id} aduanId={a.id} status={a.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
