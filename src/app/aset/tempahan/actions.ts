"use server";

import { eq, and, inArray, lt, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venueBookings, facilities, venues } from "@/db/schema/aset";
import { bookingSchema, recurringBookingSchema, bookingTypeValues } from "@/lib/validators/booking";
import {
  addBusinessDays,
  needsAdminNegeriApproval,
  isPastBooking,
  SLA_BUSINESS_DAYS,
  generateRecurringOccurrences,
  type BookingOccurrence,
} from "@/lib/booking-rules";
import { logAudit } from "@/lib/audit";
import { ms } from "@/constants/ms";

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
  venueId: string;
  negeriId: string;
  daerahId: string | null;
}

async function resolveBookingTarget(facilityId: string): Promise<BookingTarget | null> {
  const [target] = await db
    .select({
      venueId: facilities.venueId,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
    })
    .from(facilities)
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(eq(facilities.id, facilityId))
    .limit(1);
  return target ?? null;
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
  facilityId: string;
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
  const { occurrence, now } = params;

  if (isPastBooking(occurrence.startTime, now)) {
    return { ok: false, reason: ms.tempahan.ralat.tarikhLampau };
  }
  if (await hasConflict(params.facilityId, occurrence.startTime, occurrence.endTime)) {
    return { ok: false, reason: ms.tempahan.ralat.konflik };
  }

  const values = {
    facilityId: params.facilityId,
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
    facilityId,
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
      facilityId,
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
