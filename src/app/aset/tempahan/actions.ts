"use server";

import { eq, and, inArray, lt, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venueBookings, facilities, venues } from "@/db/schema/aset";
import { bookingSchema } from "@/lib/validators/booking";
import { addBusinessDays, needsAdminNegeriApproval, isPastBooking, SLA_BUSINESS_DAYS } from "@/lib/booking-rules";
import { logAudit } from "@/lib/audit";
import { ms } from "@/constants/ms";

export interface ActionState {
  error: string | null;
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
  const {
    facilityId,
    jenisTempahan,
    tujuan,
    anggaranPeserta,
    startTime,
    endTime,
    penyewaNama,
    penyewaOrganisasi,
    penyewaTelefon,
    penyewaEmel,
  } = parsed.data;

  // dalaman_kemas = Pengarah/Penolong Pengarah/Pegawai KEMAS (hq_admin/
  // admin_negeri/admin_daerah/pengarah, role sedia ada). umum = staf sama
  // hantar BAGI PIHAK penyewa luar (bukan portal awam self-service) —
  // keputusan 2026-07-21, rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 7.
  // Tiada sekatan role tambahan berbeza antara dua jenis ni buat masa ini —
  // sesiapa boleh create booking (per rbac.ts) boleh hantar mana-mana jenis.

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

  const now = new Date();
  if (isPastBooking(startTime, now)) {
    return { error: ms.tempahan.ralat.tarikhLampau };
  }

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
  if (conflicts.length > 0) {
    return { error: ms.tempahan.ralat.konflik };
  }

  const values = {
    facilityId,
    requestedBy: session.user.id,
    jenisTempahan,
    tujuan,
    anggaranPeserta,
    startTime,
    endTime,
    penyewaNama: jenisTempahan === "umum" ? penyewaNama : null,
    penyewaOrganisasi: jenisTempahan === "umum" ? penyewaOrganisasi : null,
    penyewaTelefon: jenisTempahan === "umum" ? penyewaTelefon : null,
    penyewaEmel: jenisTempahan === "umum" ? penyewaEmel : null,
    requiresAdminNegeriApproval: needsAdminNegeriApproval(startTime, now),
    slaDeadline: addBusinessDays(now, SLA_BUSINESS_DAYS),
  };

  let created: { id: string };
  try {
    [created] = await db.insert(venueBookings).values(values).returning({ id: venueBookings.id });
  } catch (err) {
    // Backstop: constraint EXCLUDE tolak race condition yang terlepas
    // pre-check atas — SQLSTATE 23P01 (exclusion_violation). Drizzle
    // (postgres-js driver) bungkus ralat Postgres sebenar dalam err.cause,
    // BUKAN err.code terus — disahkan dengan ujian sebenar (bukan andaian),
    // err.code peringkat atas sentiasa undefined untuk DrizzleQueryError.
    const cause = err && typeof err === "object" ? (err as { cause?: unknown }).cause : undefined;
    const pgCode = cause && typeof cause === "object" ? (cause as { code?: string }).code : undefined;
    if (pgCode === "23P01") {
      return { error: ms.tempahan.ralat.konflik };
    }
    throw err;
  }

  await logAudit({
    userId: session.user.id,
    action: "booking_create",
    entityType: "venue_booking",
    entityId: created.id,
    before: null,
    after: values,
  });

  revalidatePath("/aset/tempahan");
  redirect("/aset/tempahan");
}
