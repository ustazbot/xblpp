import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venueBookings, facilities, venues } from "@/db/schema/aset";
import { users } from "@/db/schema/core";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";
import { currentApprovalStage } from "@/lib/booking-rules";
import { canActOnStage } from "../approval-roles";
import { approveBooking, rejectBooking } from "../actions";
import { ApproveForm, RejectForm } from "./approval-actions";

const requestedByUser = alias(users, "requested_by_user");
const picApprovedByUser = alias(users, "pic_approved_by_user");
const hqApprovedByUser = alias(users, "hq_approved_by_user");
const rejectedByUser = alias(users, "rejected_by_user");

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  menunggu_kelulusan_pic: "secondary",
  menunggu_kelulusan_hq: "secondary",
  diluluskan: "default",
  ditolak: "destructive",
  dibatalkan: "destructive",
  perlu_pindah: "destructive",
};

export default async function TempahanDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [booking] = await db
    .select({
      id: venueBookings.id,
      status: venueBookings.status,
      jenisTempahan: venueBookings.jenisTempahan,
      tujuan: venueBookings.tujuan,
      anggaranPeserta: venueBookings.anggaranPeserta,
      startTime: venueBookings.startTime,
      endTime: venueBookings.endTime,
      penyewaNama: venueBookings.penyewaNama,
      penyewaOrganisasi: venueBookings.penyewaOrganisasi,
      penyewaTelefon: venueBookings.penyewaTelefon,
      penyewaEmel: venueBookings.penyewaEmel,
      picApprovedAt: venueBookings.picApprovedAt,
      hqApprovedAt: venueBookings.hqApprovedAt,
      rejectionReason: venueBookings.rejectionReason,
      rejectedAt: venueBookings.rejectedAt,
      slaDeadline: venueBookings.slaDeadline,
      facilityNama: facilities.nama,
      venueId: venues.id,
      venueNama: venues.nama,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
      requestedByNama: requestedByUser.nama,
      picApprovedByNama: picApprovedByUser.nama,
      hqApprovedByNama: hqApprovedByUser.nama,
      rejectedByNama: rejectedByUser.nama,
    })
    .from(venueBookings)
    .innerJoin(facilities, eq(venueBookings.facilityId, facilities.id))
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .leftJoin(requestedByUser, eq(venueBookings.requestedBy, requestedByUser.id))
    .leftJoin(picApprovedByUser, eq(venueBookings.picApprovedBy, picApprovedByUser.id))
    .leftJoin(hqApprovedByUser, eq(venueBookings.hqApprovedBy, hqApprovedByUser.id))
    .leftJoin(rejectedByUser, eq(venueBookings.rejectedBy, rejectedByUser.id))
    .where(eq(venueBookings.id, params.id))
    .limit(1);

  if (!booking) notFound();

  if (
    !(await can(session.user, "read", "booking", {
      venueId: booking.venueId,
      negeriId: booking.negeriId,
      daerahId: booking.daerahId ?? undefined,
    }))
  ) {
    notFound();
  }

  const stage = currentApprovalStage(booking.status);
  const canAct = stage !== null && canActOnStage(stage, session.user.roles, booking.venueId);

  const dtf = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const boundApprove = approveBooking.bind(null, booking.id);
  const boundReject = rejectBooking.bind(null, booking.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{booking.tujuan}</h1>
          <p className="text-sm text-muted-foreground">
            {booking.facilityNama} — {booking.venueNama}
          </p>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>{ms.tempahan.status[booking.status]}</Badge>
      </div>

      <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{ms.tempahan.labelJenisTempahan}</dt>
        <dd>{ms.tempahan.jenisTempahan[booking.jenisTempahan]}</dd>
        <dt className="text-muted-foreground">{ms.tempahan.labelPemohon}</dt>
        <dd>{booking.requestedByNama ?? "—"}</dd>
        <dt className="text-muted-foreground">{ms.tempahan.labelAnggaranPeserta}</dt>
        <dd>{booking.anggaranPeserta}</dd>
        <dt className="text-muted-foreground">{ms.tempahan.labelMasaMula}</dt>
        <dd>{dtf.format(booking.startTime)}</dd>
        <dt className="text-muted-foreground">{ms.tempahan.labelMasaTamat}</dt>
        <dd>{dtf.format(booking.endTime)}</dd>
        {booking.jenisTempahan === "umum" && (
          <>
            <dt className="text-muted-foreground">{ms.tempahan.labelPenyewaNama}</dt>
            <dd>{booking.penyewaNama}</dd>
            {booking.penyewaOrganisasi && (
              <>
                <dt className="text-muted-foreground">{ms.tempahan.labelPenyewaOrganisasi}</dt>
                <dd>{booking.penyewaOrganisasi}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{ms.tempahan.labelPenyewaTelefon}</dt>
            <dd>{booking.penyewaTelefon}</dd>
            {booking.penyewaEmel && (
              <>
                <dt className="text-muted-foreground">{ms.tempahan.labelPenyewaEmel}</dt>
                <dd>{booking.penyewaEmel}</dd>
              </>
            )}
          </>
        )}
        <dt className="text-muted-foreground">{ms.tempahan.labelPicLulus}</dt>
        <dd>
          {booking.picApprovedAt
            ? `${booking.picApprovedByNama} — ${dtf.format(booking.picApprovedAt)}`
            : ms.tempahan.belumBertindak}
        </dd>
        <dt className="text-muted-foreground">{ms.tempahan.labelHqLulus}</dt>
        <dd>
          {booking.hqApprovedAt
            ? `${booking.hqApprovedByNama} — ${dtf.format(booking.hqApprovedAt)}`
            : ms.tempahan.belumBertindak}
        </dd>
        {booking.rejectedAt && (
          <>
            <dt className="text-muted-foreground">{ms.tempahan.ditolakOleh}</dt>
            <dd>
              {booking.rejectedByNama} — {dtf.format(booking.rejectedAt)}
              <br />
              {booking.rejectionReason}
            </dd>
          </>
        )}
        {stage && (
          <>
            <dt className="text-muted-foreground">{ms.tempahan.slaDeadline}</dt>
            <dd>{dtf.format(booking.slaDeadline)}</dd>
          </>
        )}
      </dl>

      {canAct && (
        <div className="flex flex-col gap-4 rounded-md border p-4">
          <p className="text-sm font-medium">
            {stage === "pic" ? ms.tempahan.tindakanPic : ms.tempahan.tindakanHq}
          </p>
          <div className="flex gap-3">
            <ApproveForm action={boundApprove} />
          </div>
          <RejectForm action={boundReject} />
        </div>
      )}
    </div>
  );
}
