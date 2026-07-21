"use server";

import { eq, and, inArray, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities, venueBookings } from "@/db/schema/aset";
import { venueSchema, facilitySchema } from "@/lib/validators/aset";
import { isBookingAffectedByMaintenance } from "@/lib/booking-rules";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { ms } from "@/constants/ms";
import { hasManageRole } from "./manage-roles";

// Status booking yang masih PEGANG slot (bukan ditolak/dibatalkan/perlu_
// pindah sedia ada) — calon untuk ditanda "perlu_pindah" bila fasiliti
// ditanda maintenance (Langkah 6). Rujuk ACTIVE_BOOKING_STATUSES padanan
// dalam src/app/aset/tempahan/actions.ts.
const MAINTENANCE_AFFECTABLE_STATUSES = [
  "menunggu_kelulusan_pic",
  "menunggu_kelulusan_hq",
  "diluluskan",
] as const;

export interface ActionState {
  error: string | null;
}

function venueFormValues(formData: FormData) {
  return {
    nama: formData.get("nama"),
    jenis: formData.get("jenis"),
    alamat: formData.get("alamat"),
    negeriId: formData.get("negeriId"),
    daerahId: formData.get("daerahId"),
    googleMapsUrl: formData.get("googleMapsUrl"),
    picUserId: formData.get("picUserId"),
    status: formData.get("status"),
  };
}

export async function createVenue(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // create venue = hq_admin sahaja — rbac.ts pic_premis tiada "create" pada
  // resource venue (PIC urus premis SENDIRI, bukan cipta premis baharu).
  if (!hasManageRole(session.user.roles) || !(await can(session.user, "create", "venue"))) {
    return { error: ms.ralat.tiadaAkses };
  }

  const parsed = venueSchema.safeParse(venueFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }

  const [created] = await db.insert(venues).values(parsed.data).returning({ id: venues.id });

  await logAudit({
    userId: session.user.id,
    action: "venue_create",
    entityType: "venue",
    entityId: created.id,
    before: null,
    after: parsed.data,
  });

  if (parsed.data.picUserId) {
    await notify({
      userId: parsed.data.picUserId,
      title: ms.aset.notifikasi.picDilantikTajuk,
      body: ms.aset.notifikasi.picDilantikBadan(parsed.data.nama),
      link: `/aset/premis/${created.id}`,
      channels: ["in_app", "email"],
    });
  }

  revalidatePath("/aset/premis");
  redirect(`/aset/premis/${created.id}`);
}

export async function updateVenue(
  venueId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (
    !hasManageRole(session.user.roles) ||
    !(await can(session.user, "update", "venue", { venueId }))
  ) {
    return { error: ms.ralat.tiadaAkses };
  }

  const parsed = venueSchema.safeParse(venueFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }

  const [before] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!before) {
    return { error: ms.ralat.umum };
  }

  await db
    .update(venues)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(venues.id, venueId));

  await logAudit({
    userId: session.user.id,
    action: "venue_update",
    entityType: "venue",
    entityId: venueId,
    before,
    after: parsed.data,
  });

  if (parsed.data.picUserId && parsed.data.picUserId !== before.picUserId) {
    await notify({
      userId: parsed.data.picUserId,
      title: ms.aset.notifikasi.picDilantikTajuk,
      body: ms.aset.notifikasi.picDilantikBadan(parsed.data.nama),
      link: `/aset/premis/${venueId}`,
      channels: ["in_app", "email"],
    });
  }

  revalidatePath("/aset/premis");
  revalidatePath(`/aset/premis/${venueId}`);
  redirect(`/aset/premis/${venueId}`);
}

export async function createFacility(
  venueId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // create facility = hq_admin sahaja, sama sebab macam create venue.
  if (!hasManageRole(session.user.roles) || !(await can(session.user, "create", "facility"))) {
    return { error: ms.ralat.tiadaAkses };
  }

  const parsed = facilitySchema.safeParse({
    nama: formData.get("nama"),
    jenis: formData.get("jenis"),
    kapasiti: formData.get("kapasiti"),
    status: formData.get("status"),
    maintenanceUntil: formData.get("maintenanceUntil"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }

  const [created] = await db
    .insert(facilities)
    .values({ ...parsed.data, venueId })
    .returning({ id: facilities.id });

  await logAudit({
    userId: session.user.id,
    action: "facility_create",
    entityType: "facility",
    entityId: created.id,
    before: null,
    after: { ...parsed.data, venueId },
  });

  revalidatePath(`/aset/premis/${venueId}`);
  redirect(`/aset/premis/${venueId}`);
}

export async function updateFacility(
  venueId: string,
  facilityId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (
    !hasManageRole(session.user.roles) ||
    !(await can(session.user, "update", "facility", { venueId }))
  ) {
    return { error: ms.ralat.tiadaAkses };
  }

  const parsed = facilitySchema.safeParse({
    nama: formData.get("nama"),
    jenis: formData.get("jenis"),
    kapasiti: formData.get("kapasiti"),
    status: formData.get("status"),
    maintenanceUntil: formData.get("maintenanceUntil"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }

  const [before] = await db.select().from(facilities).where(eq(facilities.id, facilityId)).limit(1);
  if (!before || before.venueId !== venueId) {
    return { error: ms.ralat.umum };
  }

  await db.update(facilities).set(parsed.data).where(eq(facilities.id, facilityId));

  await logAudit({
    userId: session.user.id,
    action: "facility_update",
    entityType: "facility",
    entityId: facilityId,
    before,
    after: parsed.data,
  });

  if (parsed.data.status === "maintenance") {
    await cascadeMaintenanceNotify({
      facilityId,
      facilityNama: before.nama,
      venueId,
      maintenanceUntil: parsed.data.maintenanceUntil,
      actingUserId: session.user.id,
    });
  }

  revalidatePath(`/aset/premis/${venueId}`);
  redirect(`/aset/premis/${venueId}`);
}

// Tanda tempahan sedia ada yang bertindih dengan tempoh penyelenggaraan
// sebagai "perlu_pindah" + maklumkan pemohon. Dipanggil setiap kali fasiliti
// disimpan dengan status=maintenance (bukan hanya sekali semasa transisi) —
// supaya sambungan tarikh maintenanceUntil turut menangkap tempahan yang
// baharu terjejas, tanpa jejaskan tempahan yang dah ditanda perlu_pindah
// (tak termasuk dalam MAINTENANCE_AFFECTABLE_STATUSES, elak notifikasi berulang).
async function cascadeMaintenanceNotify(params: {
  facilityId: string;
  facilityNama: string;
  venueId: string;
  maintenanceUntil: string | null;
  actingUserId: string;
}): Promise<void> {
  const now = new Date();
  const maintenanceUntilDate = params.maintenanceUntil
    ? new Date(`${params.maintenanceUntil}T23:59:59+08:00`)
    : null;

  const candidates = await db
    .select({
      id: venueBookings.id,
      requestedBy: venueBookings.requestedBy,
      startTime: venueBookings.startTime,
      endTime: venueBookings.endTime,
      status: venueBookings.status,
    })
    .from(venueBookings)
    .where(
      and(
        eq(venueBookings.facilityId, params.facilityId),
        inArray(venueBookings.status, MAINTENANCE_AFFECTABLE_STATUSES),
        gt(venueBookings.endTime, now),
      ),
    );

  const affected = candidates.filter((b) => isBookingAffectedByMaintenance(b, now, maintenanceUntilDate));
  if (affected.length === 0) return;

  const [venue] = await db.select({ nama: venues.nama }).from(venues).where(eq(venues.id, params.venueId)).limit(1);

  for (const booking of affected) {
    await db
      .update(venueBookings)
      .set({ status: "perlu_pindah", updatedAt: now })
      .where(eq(venueBookings.id, booking.id));

    await logAudit({
      userId: params.actingUserId,
      action: "booking_maintenance_perlu_pindah",
      entityType: "venue_booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: { status: "perlu_pindah" },
    });

    await notify({
      userId: booking.requestedBy,
      title: ms.tempahan.notifikasi.perluPindahTajuk,
      body: ms.tempahan.notifikasi.perluPindahBadan(params.facilityNama, venue?.nama ?? ""),
      link: `/aset/tempahan/${booking.id}`,
      channels: ["in_app", "email"],
    });
  }
}
