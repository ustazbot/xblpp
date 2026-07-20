import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, userRoles } from "@/db/schema/core";
import { verifyPassword, DUMMY_HASH } from "@/lib/password";
import {
  isLocked,
  evaluateSuccessfulPassword,
  nextFailedAttemptState,
  RESET_ATTEMPT_STATE,
} from "@/lib/auth-rules";
import { authConfig } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// code diserlahkan dalam URL callback (bukan sensitif) — mesej sebenar ikut code
// ini dipetakan di UI (login/page.tsx), bukan message() sebab beta API tak stabil.
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}
class LockedError extends CredentialsSignin {
  code = "locked";
}
class InactiveError extends CredentialsSignin {
  code = "inactive";
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentialsError();
        const { email, password } = parsed.data;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
          // Timing-safety: verify against dummy hash supaya respons masa sama
          // ada tak email tu wujud atau tidak — elak user enumeration.
          await verifyPassword(DUMMY_HASH, password);
          throw new InvalidCredentialsError();
        }

        const now = new Date();
        if (isLocked(user, now)) {
          throw new LockedError();
        }

        const passwordOk = await verifyPassword(user.passwordHash, password);
        if (!passwordOk) {
          const next = nextFailedAttemptState(user, now);
          await db.update(users).set(next).where(eq(users.id, user.id));
          throw next.lockedUntil ? new LockedError() : new InvalidCredentialsError();
        }

        // Status disemak SELEPAS password sah — percubaan yang tak tahu password
        // tak dapat maklumat status akaun (elak enumeration akaun digantung).
        const result = evaluateSuccessfulPassword(user);
        if (result.outcome === "inactive") {
          throw new InactiveError();
        }

        await db.update(users).set(RESET_ATTEMPT_STATE).where(eq(users.id, user.id));

        const userRoleRows = await db
          .select({
            code: roles.code,
            negeriId: userRoles.negeriId,
            daerahId: userRoles.daerahId,
            venueId: userRoles.venueId,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.nama,
          forcePasswordChange: user.forcePasswordChange,
          roles: userRoleRows,
        };
      },
    }),
  ],
});
