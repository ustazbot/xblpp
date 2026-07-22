"use server";

import { eq, and, inArray, lt, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can, type RoleAssignment } from "@/lib/rbac";
import { db } from "@/db";
import { venueBookings, facilities, venues } from "@/db/schema/aset";
import { users, roles, userRoles } from "@/db/schema/core";
import { bookingSchema, recurringBookingSchema, bookingTypeValues } from "@/lib/validators/booking";
import {
  addBusinessDays,
  needsAdminNegeriApproval,
  isPastBooking,
  SLA_BUSINESS_DAYS,
  generateRecurringOccurrences,
  currentApprovalStage,
  nextStatusOnApprove,
  canCancelBooking,
  cancellationRequiresReason,
  type BookingOccurrence,
} from "@/lib/booking-rules";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { ms } from "@/constants/ms";
import { canActOnStage } from "./approval-roles";

export interface ActionState {
  error: string | null;
}

export interface RecurringActionState {
  error: string | null;
  summary: { total: number; created: number; gagal: { tarikh: string; sebab: string }[] } | null;
}

// Status yang PEGANG slot fasiliti — padan predicate WHERE constraint
// EXCLUDE (dikemaskini Langkah 3.5, drizzle/0005_aset_booking_type_dual_
// approval.sql, untuk kelulusan dwi-peringkat). Kalau senarai ni dan
// predicate constraint tak sync, app-layer check ni jadi silap (false
// negative/positive) — KEKALKAN sentiasa padan.
const ACTIVE_BOOKING_STATUSES = [
  "menunggu_kelulusan_pic",
  "menunggu_kelulusan_hq",
  "diluluskan",
  "perlu_pindah",
] as const;

interface BookingTarget {
  facilityId: string;
  venueId: string;
  negeriId: string;
  daerahId: string | null;
  picUserId: string | null;
  venueNama: string;
  facilityNama: string;
}

async function resolveBookingTarget(facilityId: string): Promise<BookingTarget | null> {
  const [target] = await db
    .select({
      venueId: facilities.venueId,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
      picUserId: venues.picUserId,
      venueNama: venues.nama,
      facilityNama: facilities.nama,
    })
    .from(facilities)
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(eq(facilities.id, facilityId))
    .limit(1);
  return target ? { facilityId, ...target } : null;
}

async function hqAdminUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.code, "hq_admin"));
  return rows.map((r) => r.id);
}

async function hasConflict(facilityId: string, startTime: Date, endTime: Date): Promise<boolean> {
  // Semakan konflik app-layer (UX awal, mesej mesra) — DB EXCLUDE constraint
  // (Langkah 1) kekal backstop sebenar untuk race condition (dua request
  // serentak lepas pre-check ni tapi sebelum INSERT).
  const conflicts = await db
    .select({ id: venueBookings.id })
    .from(venueBookings)
    .where(
      and(
        eq(venueBookings.facilityId, facilityId),
        inArray(venueBookings.status, ACTIVE_BOOKING_STATUSES),
        lt(venueBookings.startTime, endTime),
        gt(venueBookings.endTime, startTime),
      ),
    )
    .limit(1);
  return conflicts.length > 0;
}

// SQLSTATE 23P01 (exclusion_violation) — backstop constraint EXCLUDE untuk
// race condition terlepas pre-check atas. Drizzle (postgres-js driver)
// bungkus ralat Postgres sebenar dalam err.cause, BUKAN err.code terus —
// disahkan dengan ujian sebenar (bukan andaian), Langkah 3.
function isExclusionViolation(err: unknown): boolean {
  const cause = err && typeof err === "object" ? (err as { cause?: unknown }).cause : undefined;
  const pgCode = cause && typeof cause === "object" ? (cause as { code?: string }).code : undefined;
  return pgCode === "23P01";
}

interface InsertOccurrenceParams {
  target: BookingTarget;
  requestedBy: string;
  jenisTempahan: (typeof bookingTypeValues)[number];
  tujuan: string;
  anggaranPeserta: number;
  occurrence: BookingOccurrence;
  penyewaNama?: string;
  penyewaOrganisasi?: string;
  penyewaTelefon?: string;
  penyewaEmel?: string;
  recurringGroupId: string | null;
  now: Date;
}

// Cuba satu kejadian (dipakai untuk tempahan tunggal DAN setiap kejadian
// tempahan berulang) — pulang { ok, id } atau { ok:false, reason } tanpa
// redirect/throw, supaya caller (single: redirect terus; recurring: kumpul
// keputusan penuh siri) boleh kawal aliran sendiri.
async function insertOneOccurrence(
  params: InsertOccurrenceParams,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const { occurrence, now, target } = params;

  if (isPastBooking(occurrence.startTime, now)) {
    return { ok: false, reason: ms.tempahan.ralat.tarikhLampau };
  }
  if (await hasConflict(target.facilityId, occurrence.startTime, occurrence.endTime)) {
    return { ok: false, reason: ms.tempahan.ralat.konflik };
  }

  const values = {
    facilityId: target.facilityId,
    requestedBy: params.requestedBy,
    jenisTempahan: params.jenisTempahan,
    tujuan: params.tujuan,
    anggaranPeserta: params.anggaranPeserta,
    startTime: occurrence.startTime,
    endTime: occurrence.endTime,
    penyewaNama: params.jenisTempahan === "umum" ? params.penyewaNama : null,
    penyewaOrganisasi: params.jenisTempahan === "umum" ? params.penyewaOrganisasi : null,
    penyewaTelefon: params.jenisTempahan === "umum" ? params.penyewaTelefon : null,
    penyewaEmel: params.jenisTempahan === "umum" ? params.penyewaEmel : null,
    recurringGroupId: params.recurringGroupId,
    requiresAdminNegeriApproval: needsAdminNegeriApproval(occurrence.startTime, now),
    slaDeadline: addBusinessDays(now, SLA_BUSINESS_DAYS),
  };

  let created: { id: string };
  try {
    [created] = await db.insert(venueBookings).values(values).returning({ id: venueBookings.id });
  } catch (err) {
    if (isExclusionViolation(err)) {
      return { ok: false, reason: ms.tempahan.ralat.konflik };
    }
    throw err;
  }

  await logAudit({
    userId: params.requestedBy,
    action: "booking_create",
    entityType: "venue_booking",
    entityId: created.id,
    before: null,
    after: values,
  });

  if (target.picUserId) {
    await notify({
      userId: target.picUserId,
      title: ms.tempahan.notifikasi.picBaharuTajuk,
      body: ms.tempahan.notifikasi.picBaharuBadan(target.facilityNama, target.venueNama),
      link: `/aset/tempahan/${created.id}`,
      channels: ["in_app", "email"],
    });
  }

  return { ok: true, id: created.id };
}

export async function createBooking(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = bookingSchema.safeParse({
    facilityId: formData.get("facilityId"),
    jenisTempahan: formData.get("jenisTempahan"),
    tujuan: formData.get("tujuan"),
    anggaranPeserta: formData.get("anggaranPeserta"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    penyewaNama: formData.get("penyewaNama"),
    penyewaOrganisasi: formData.get("penyewaOrganisasi"),
    penyewaTelefon: formData.get("penyewaTelefon"),
    penyewaEmel: formData.get("penyewaEmel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }
  const { facilityId, startTime, endTime, ...rest } = parsed.data;

  // dalaman_kemas = Pengarah/Penolong Pengarah/Pegawai KEMAS (hq_admin/
  // admin_negeri/admin_daerah/pengarah, role sedia ada). umum = staf sama
  // hantar BAGI PIHAK penyewa luar (bukan portal awam self-service) —
  // keputusan 2026-07-21, rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 7.
  const target = await resolveBookingTarget(facilityId);
  if (!target) {
    return { error: ms.ralat.umum };
  }
  if (
    !(await can(session.user, "create", "booking", {
      venueId: target.venueId,
      negeriId: target.negeriId,
      daerahId: target.daerahId ?? undefined,
    }))
  ) {
    return { error: ms.ralat.tiadaAkses };
  }

  const result = await insertOneOccurrence({
    target,
    requestedBy: session.user.id,
    occurrence: { startTime, endTime },
    recurringGroupId: null,
    now: new Date(),
    ...rest,
  });
  if (!result.ok) {
    return { error: result.reason };
  }

  revalidatePath("/aset/tempahan");
  redirect("/aset/tempahan");
}

export async function createRecurringBooking(
  _prevState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = recurringBookingSchema.safeParse({
    facilityId: formData.get("facilityId"),
    jenisTempahan: formData.get("jenisTempahan"),
    tujuan: formData.get("tujuan"),
    anggaranPeserta: formData.get("anggaranPeserta"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    penyewaNama: formData.get("penyewaNama"),
    penyewaOrganisasi: formData.get("penyewaOrganisasi"),
    penyewaTelefon: formData.get("penyewaTelefon"),
    penyewaEmel: formData.get("penyewaEmel"),
    recurringPattern: formData.get("recurringPattern"),
    recurringCount: formData.get("recurringCount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum, summary: null };
  }
  const { facilityId, startTime, endTime, recurringPattern, recurringCount, ...rest } = parsed.data;

  const target = await resolveBookingTarget(facilityId);
  if (!target) {
    return { error: ms.ralat.umum, summary: null };
  }
  if (
    !(await can(session.user, "create", "booking", {
      venueId: target.venueId,
      negeriId: target.negeriId,
      daerahId: target.daerahId ?? undefined,
    }))
  ) {
    return { error: ms.ralat.tiadaAkses, summary: null };
  }

  const occurrences = generateRecurringOccurrences(startTime, endTime, recurringPattern, recurringCount);
  const now = new Date();
  // Satu recurringGroupId dikongsi seluruh siri — kaitkan kejadian yang
  // BERJAYA sahaja (kejadian gagal tak masuk DB langsung, tiada row untuk
  // dikaitkan). Kelulusan/pembatalan tetap PER KEJADIAN (bukan seluruh
  // siri sekali gus) — setiap row venue_bookings punya proses sendiri.
  const recurringGroupId = crypto.randomUUID();

  let created = 0;
  const gagal: { tarikh: string; sebab: string }[] = [];
  const dtf = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  for (const occurrence of occurrences) {
    const result = await insertOneOccurrence({
      target,
      requestedBy: session.user.id,
      occurrence,
      recurringGroupId,
      now,
      ...rest,
    });
    if (result.ok) {
      created += 1;
    } else {
      gagal.push({ tarikh: dtf.format(occurrence.startTime), sebab: result.reason });
    }
  }

  revalidatePath("/aset/tempahan");
  return {
    error: null,
    summary: { total: occurrences.length, created, gagal },
  };
}

interface BookingWithTarget {
  id: string;
  status: string;
  requestedBy: string;
  tujuan: string;
  startTime: Date;
  target: BookingTarget;
}

async function loadBookingWithTarget(bookingId: string): Promise<BookingWithTarget | null> {
  const [row] = await db
    .select({
      id: venueBookings.id,
      status: venueBookings.status,
      requestedBy: venueBookings.requestedBy,
      tujuan: venueBookings.tujuan,
      startTime: venueBookings.startTime,
      facilityId: venueBookings.facilityId,
      facilityNama: facilities.nama,
      venueId: venues.id,
      venueNama: venues.nama,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
      picUserId: venues.picUserId,
    })
    .from(venueBookings)
    .innerJoin(facilities, eq(venueBookings.facilityId, facilities.id))
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(eq(venueBookings.id, bookingId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    requestedBy: row.requestedBy,
    tujuan: row.tujuan,
    startTime: row.startTime,
    target: {
      facilityId: row.facilityId,
      facilityNama: row.facilityNama,
      venueId: row.venueId,
      venueNama: row.venueNama,
      negeriId: row.negeriId,
      daerahId: row.daerahId,
      picUserId: row.picUserId,
    },
  };
}

// Tandatangan wajib padan useFormState(prevState, formData) — lulus tak
// perlukan data borang, jadi kedua-dua parameter tak digunakan.
export async function approveBooking(
  bookingId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: ActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const booking = await loadBookingWithTarget(bookingId);
  if (!booking) {
    return { error: ms.ralat.umum };
  }
  const stage = currentApprovalStage(booking.status);
  if (!stage) {
    return { error: ms.tempahan.ralat.statusBukanMenunggu };
  }
  if (
    !canActOnStage(stage, session.user.roles, booking.target.venueId) ||
    !(await can(session.user, "approve", "booking", {
      venueId: booking.target.venueId,
      negeriId: booking.target.negeriId,
      daerahId: booking.target.daerahId ?? undefined,
    }))
  ) {
    return { error: ms.ralat.tiadaAkses };
  }

  const now = new Date();
  const nextStatus = nextStatusOnApprove(stage);
  const stageColumns =
    stage === "pic"
      ? { picApprovedBy: session.user.id, picApprovedAt: now }
      : { hqApprovedBy: session.user.id, hqApprovedAt: now };

  await db
    .update(venueBookings)
    .set({
      status: nextStatus,
      ...stageColumns,
      // Giliran seterusnya dapat SLA 3 hari bekerja SENDIRI (bukan sambung
      // baki peringkat sebelum) — peringkat diluluskan penuh tak perlu SLA
      // lagi (terminal, tiada tindakan menunggu).
      slaDeadline: nextStatus === "diluluskan" ? undefined : addBusinessDays(now, SLA_BUSINESS_DAYS),
      updatedAt: now,
    })
    .where(eq(venueBookings.id, bookingId));

  await logAudit({
    userId: session.user.id,
    action: stage === "pic" ? "booking_approve_pic" : "booking_approve_hq",
    entityType: "venue_booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: nextStatus },
  });

  if (stage === "pic") {
    // PIC lulus -> giliran HQ. Maklumkan pemohon (kemajuan) + SEMUA hq_admin
    // (tindakan diperlukan).
    await notify({
      userId: booking.requestedBy,
      title: ms.tempahan.notifikasi.picLulusTajuk,
      body: ms.tempahan.notifikasi.picLulusBadan(booking.target.facilityNama),
      link: `/aset/tempahan/${bookingId}`,
      channels: ["in_app", "email"],
    });
    for (const hqUserId of await hqAdminUserIds()) {
      await notify({
        userId: hqUserId,
        title: ms.tempahan.notifikasi.hqMenungguTajuk,
        body: ms.tempahan.notifikasi.hqMenungguBadan(booking.target.facilityNama, booking.target.venueNama),
        link: `/aset/tempahan/${bookingId}`,
        channels: ["in_app", "email"],
      });
    }
  } else {
    // HQ lulus -> diluluskan penuh. Maklumkan pemohon + PIC (kalau ada).
    await notify({
      userId: booking.requestedBy,
      title: ms.tempahan.notifikasi.diluluskanTajuk,
      body: ms.tempahan.notifikasi.diluluskanBadan(booking.target.facilityNama),
      link: `/aset/tempahan/${bookingId}`,
      channels: ["in_app", "email"],
    });
    if (booking.target.picUserId) {
      await notify({
        userId: booking.target.picUserId,
        title: ms.tempahan.notifikasi.diluluskanTajuk,
        body: ms.tempahan.notifikasi.diluluskanBadan(booking.target.facilityNama),
        link: `/aset/tempahan/${bookingId}`,
        channels: ["in_app"],
      });
    }
  }

  revalidatePath("/aset/tempahan");
  revalidatePath(`/aset/tempahan/${bookingId}`);
  redirect(`/aset/tempahan/${bookingId}`);
}

export async function rejectBooking(
  bookingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  if (!rejectionReason) {
    return { error: ms.tempahan.ralat.sebabTolakWajib };
  }

  const booking = await loadBookingWithTarget(bookingId);
  if (!booking) {
    return { error: ms.ralat.umum };
  }
  const stage = currentApprovalStage(booking.status);
  if (!stage) {
    return { error: ms.tempahan.ralat.statusBukanMenunggu };
  }
  if (
    !canActOnStage(stage, session.user.roles, booking.target.venueId) ||
    !(await can(session.user, "approve", "booking", {
      venueId: booking.target.venueId,
      negeriId: booking.target.negeriId,
      daerahId: booking.target.daerahId ?? undefined,
    }))
  ) {
    return { error: ms.ralat.tiadaAkses };
  }

  const now = new Date();
  await db
    .update(venueBookings)
    .set({
      status: "ditolak",
      rejectedBy: session.user.id,
      rejectedAt: now,
      rejectionReason,
      updatedAt: now,
    })
    .where(eq(venueBookings.id, bookingId));

  await logAudit({
    userId: session.user.id,
    action: "booking_reject",
    entityType: "venue_booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: "ditolak", rejectionReason },
  });

  await notify({
    userId: booking.requestedBy,
    title: ms.tempahan.notifikasi.ditolakTajuk,
    body: ms.tempahan.notifikasi.ditolakBadan(booking.target.facilityNama, rejectionReason),
    link: `/aset/tempahan/${bookingId}`,
    channels: ["in_app", "email"],
  });

  revalidatePath("/aset/tempahan");
  revalidatePath(`/aset/tempahan/${bookingId}`);
  redirect(`/aset/tempahan/${bookingId}`);
}

// Langkah 9 — pembatalan. Dibenarkan untuk (a) PEMOHON ASAL (pemilikan,
// sama pattern "semak pemilikan di call-site" rbac.ts) ATAU (b) sesiapa
// dengan permission booking:update blanket (hq_admin/admin_negeri —
// pentadbiran, bukan pemilik). Async (panggil can()) jadi boleh terus
// export dari fail "use server" ni, tak perlukan fail berasingan macam
// approval-roles.ts (yang synchronous, tak boleh export dari fail ni).
export async function canCancelAccess(
  user: { id: string; roles: RoleAssignment[] },
  booking: { requestedBy: string; venueId: string; negeriId: string; daerahId: string | null },
): Promise<boolean> {
  if (booking.requestedBy === user.id) return true;
  return can(user, "update", "booking", {
    venueId: booking.venueId,
    negeriId: booking.negeriId,
    daerahId: booking.daerahId ?? undefined,
  });
}

export async function cancelBooking(
  bookingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const booking = await loadBookingWithTarget(bookingId);
  if (!booking) {
    return { error: ms.ralat.umum };
  }

  const now = new Date();
  if (!canCancelBooking(booking.status, booking.startTime, now)) {
    return { error: ms.tempahan.ralat.tidakBolehBatal };
  }
  if (
    !(await canCancelAccess(session.user, {
      requestedBy: booking.requestedBy,
      venueId: booking.target.venueId,
      negeriId: booking.target.negeriId,
      daerahId: booking.target.daerahId,
    }))
  ) {
    return { error: ms.ralat.tiadaAkses };
  }

  const cancellationReason = String(formData.get("cancellationReason") ?? "").trim();
  if (cancellationRequiresReason(booking.startTime, now) && !cancellationReason) {
    return { error: ms.tempahan.ralat.sebabBatalWajib };
  }

  await db
    .update(venueBookings)
    .set({
      status: "dibatalkan",
      cancelledBy: session.user.id,
      cancelledAt: now,
      cancellationReason: cancellationReason || null,
      updatedAt: now,
    })
    .where(eq(venueBookings.id, bookingId));

  await logAudit({
    userId: session.user.id,
    action: "booking_cancel",
    entityType: "venue_booking",
    entityId: bookingId,
    before: { status: booking.status },
    after: { status: "dibatalkan", cancellationReason: cancellationReason || null },
  });

  if (booking.target.picUserId) {
    await notify({
      userId: booking.target.picUserId,
      title: ms.tempahan.notifikasi.dibatalkanSlotTajuk,
      body: ms.tempahan.notifikasi.dibatalkanSlotBadan(booking.target.facilityNama, booking.target.venueNama),
      link: `/aset/tempahan/${bookingId}`,
      channels: ["in_app"],
    });
  }
  if (session.user.id !== booking.requestedBy) {
    await notify({
      userId: booking.requestedBy,
      title: ms.tempahan.notifikasi.dibatalkanPemohonTajuk,
      body: ms.tempahan.notifikasi.dibatalkanPemohonBadan(booking.target.facilityNama),
      link: `/aset/tempahan/${bookingId}`,
      channels: ["in_app", "email"],
    });
  }

  revalidatePath("/aset/tempahan");
  revalidatePath(`/aset/tempahan/${bookingId}`);
  redirect(`/aset/tempahan/${bookingId}`);
}
