"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { facilities, aduanKerosakan } from "@/db/schema/aset";
import { createAduanSchema } from "@/lib/validators/aduan";
import { logAudit } from "@/lib/audit";
import { ms } from "@/constants/ms";

export interface AduanActionState {
  error: string | null;
}

const initialState: AduanActionState = { error: null };

// Kaitan facility -> venue diperlukan untuk scopeMatches (rbac.ts can()
// terima ScopeTarget.venueId, bukan facilityId — pic_premis skop pada
// venue, bukan fasiliti individu).
async function facilityVenueId(facilityId: string): Promise<string | null> {
  const [row] = await db
    .select({ venueId: facilities.venueId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);
  return row?.venueId ?? null;
}

export async function createAduan(venueId: string, _prevState: AduanActionState, formData: FormData): Promise<AduanActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = createAduanSchema.safeParse({
    facilityId: formData.get("facilityId"),
    kategori: formData.get("kategori"),
    keterukan: formData.get("keterukan"),
    keterangan: formData.get("keterangan"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }

  const actualVenueId = await facilityVenueId(parsed.data.facilityId);
  if (!actualVenueId || actualVenueId !== venueId) {
    return { error: ms.ralat.umum };
  }

  if (!(await can(session.user, "create", "aduan", { venueId: actualVenueId }))) {
    return { error: ms.ralat.tiadaAkses };
  }

  const [created] = await db
    .insert(aduanKerosakan)
    .values({
      facilityId: parsed.data.facilityId,
      kategori: parsed.data.kategori,
      keterukan: parsed.data.keterukan,
      keterangan: parsed.data.keterangan,
      dilaporkanOleh: session.user.id,
    })
    .returning({ id: aduanKerosakan.id });

  await logAudit({
    userId: session.user.id,
    action: "aduan_create",
    entityType: "aduan_kerosakan",
    entityId: created.id,
    before: null,
    after: { facilityId: parsed.data.facilityId, kategori: parsed.data.kategori, keterukan: parsed.data.keterukan },
  });

  revalidatePath(`/aset/premis/${venueId}`);
  return { error: null };
}

const aduanIdSchema = z.string().uuid();

export async function markAduanDalamTindakan(venueId: string, _prevState: AduanActionState, formData: FormData): Promise<AduanActionState> {
  return updateAduanStatus(venueId, formData, "dalam_tindakan");
}

export async function markAduanSelesai(venueId: string, _prevState: AduanActionState, formData: FormData): Promise<AduanActionState> {
  return updateAduanStatus(venueId, formData, "selesai");
}

async function updateAduanStatus(
  venueId: string,
  formData: FormData,
  status: "dalam_tindakan" | "selesai",
): Promise<AduanActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsedId = aduanIdSchema.safeParse(formData.get("aduanId"));
  if (!parsedId.success) return { error: ms.ralat.umum };

  const [row] = await db
    .select({ id: aduanKerosakan.id, facilityId: aduanKerosakan.facilityId, status: aduanKerosakan.status })
    .from(aduanKerosakan)
    .where(eq(aduanKerosakan.id, parsedId.data))
    .limit(1);
  if (!row) return { error: ms.ralat.umum };

  const actualVenueId = await facilityVenueId(row.facilityId);
  if (!actualVenueId || actualVenueId !== venueId) {
    return { error: ms.ralat.umum };
  }
  if (!(await can(session.user, "update", "aduan", { venueId: actualVenueId }))) {
    return { error: ms.ralat.tiadaAkses };
  }

  const now = new Date();
  await db
    .update(aduanKerosakan)
    .set({
      status,
      ...(status === "dalam_tindakan" ? { tindakanOleh: session.user.id, tindakanPada: now } : {}),
      ...(status === "selesai" ? { selesaiPada: now } : {}),
    })
    .where(eq(aduanKerosakan.id, row.id));

  await logAudit({
    userId: session.user.id,
    action: "aduan_update_status",
    entityType: "aduan_kerosakan",
    entityId: row.id,
    before: { status: row.status },
    after: { status },
  });

  revalidatePath(`/aset/premis/${venueId}`);
  return { error: null };
}

export { initialState as aduanActionInitialState };
