"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { can, isHqAdmin } from "@/lib/rbac";
import { db } from "@/db";
import { users, userRoles, roles } from "@/db/schema/core";
import { createUserSchema } from "@/lib/validators/user";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { ms } from "@/constants/ms";

export interface ActionState {
  error: string | null;
  tempPassword?: string;
  targetEmail?: string;
}

const initialState: ActionState = { error: null };

function userFormValues(formData: FormData) {
  return {
    nama: formData.get("nama"),
    email: formData.get("email"),
    telefon: formData.get("telefon"),
    jawatan: formData.get("jawatan"),
    roleCode: formData.get("roleCode"),
    negeriId: formData.get("negeriId"),
    daerahId: formData.get("daerahId"),
    venueId: formData.get("venueId"),
  };
}

// Cipta pengguna = hq_admin sahaja (rbac.ts: hanya hq_admin ada "create" pada
// resource "user" — admin_negeri/admin_daerah dapat "update" sahaja, skop
// urus pengguna sedia ada dalam kawasan mereka, bukan cipta akaun baharu).
export async function createUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!isHqAdmin(session.user.roles) || !(await can(session.user, "create", "user"))) {
    return { error: ms.ralat.tiadaAkses };
  }

  const parsed = createUserSchema.safeParse(userFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? ms.ralat.umum };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing) {
    return { error: ms.admin.pengguna.ralatEmelWujud };
  }

  const [roleRow] = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, parsed.data.roleCode)).limit(1);
  if (!roleRow) {
    return { error: ms.ralat.umum };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      nama: parsed.data.nama,
      telefon: parsed.data.telefon ?? null,
      jawatan: parsed.data.jawatan ?? null,
      negeriId: parsed.data.negeriId ?? null,
      daerahId: parsed.data.daerahId ?? null,
      forcePasswordChange: true,
      createdBy: session.user.id,
    })
    .returning({ id: users.id });

  await db.insert(userRoles).values({
    userId: created.id,
    roleId: roleRow.id,
    negeriId: parsed.data.negeriId ?? null,
    daerahId: parsed.data.daerahId ?? null,
    venueId: parsed.data.venueId ?? null,
  });

  // Before/after TIADA hash/password walaupun hash — bukan maklumat berguna
  // untuk audit trail (sama pattern reset-password/actions.ts).
  await logAudit({
    userId: session.user.id,
    action: "user_create",
    entityType: "user",
    entityId: created.id,
    before: null,
    after: { email: parsed.data.email, nama: parsed.data.nama, roleCode: parsed.data.roleCode },
  });

  revalidatePath("/admin");
  return { error: null, tempPassword, targetEmail: parsed.data.email };
}

const userIdSchema = z.string().uuid();

// Reset = hq_admin sahaja buat masa ni (matcher /admin dalam middleware.ts
// sedia ada hq_admin-only) — rbac.ts dah sedia untuk longgarkan ke admin_
// negeri/daerah (skop wilayah) kelak, tapi itu perlu ubah middleware juga,
// keputusan berasingan.
export async function resetUserPassword(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!isHqAdmin(session.user.roles) || !(await can(session.user, "update", "user"))) {
    return { error: ms.ralat.tiadaAkses };
  }

  const parsedId = userIdSchema.safeParse(formData.get("userId"));
  if (!parsedId.success) {
    return { error: ms.ralat.umum };
  }

  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, parsedId.data))
    .limit(1);
  if (!target) {
    return { error: ms.ralat.umum };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      forcePasswordChange: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id));

  await logAudit({
    userId: session.user.id,
    action: "user_reset_password",
    entityType: "user",
    entityId: target.id,
    before: null,
    after: null,
  });

  revalidatePath("/admin");
  return { error: null, tempPassword, targetEmail: target.email };
}

export { initialState as adminActionInitialState };
