"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities } from "@/db/schema/aset";
import { venueSchema, facilitySchema } from "@/lib/validators/aset";
import { logAudit } from "@/lib/audit";
import { ms } from "@/constants/ms";
import { hasManageRole } from "./manage-roles";

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

  revalidatePath(`/aset/premis/${venueId}`);
  redirect(`/aset/premis/${venueId}`);
}
