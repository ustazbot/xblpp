// Logik keputusan login — pure functions, tiada DB/IO, supaya boleh diuji
// tanpa Postgres. I/O (fetch user, argon2 verify, UPDATE) tinggal di lib/auth.ts.

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type LoginAttemptResult =
  | { outcome: "ok" }
  | { outcome: "locked"; retryAfter: Date }
  | { outcome: "invalid_credentials" }
  | { outcome: "inactive" };

interface UserLockState {
  status: "aktif" | "digantung" | "tidak_aktif";
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

// Dipanggil SEBELUM argon2 verify — kalau masih locked, tolak terus tanpa
// bazir CPU verify password / bertambah kiraan.
export function isLocked(user: Pick<UserLockState, "lockedUntil">, now: Date): boolean {
  return user.lockedUntil !== null && user.lockedUntil.getTime() > now.getTime();
}

// Dipanggil SELEPAS argon2 verify berjaya — status disemak lepas password betul
// supaya percubaan gagal (yang tak tahu password) tak dapat maklumat status akaun.
export function evaluateSuccessfulPassword(
  user: Pick<UserLockState, "status">,
): LoginAttemptResult {
  if (user.status !== "aktif") {
    return { outcome: "inactive" };
  }
  return { outcome: "ok" };
}

// Kiraan seterusnya lepas password SALAH. Lockout window lama yang dah lepas
// dianggap reset — percubaan seterusnya mula semula dari 1, bukan sambung kiraan lama.
export function nextFailedAttemptState(
  user: Pick<UserLockState, "failedLoginAttempts" | "lockedUntil">,
  now: Date,
): { failedLoginAttempts: number; lockedUntil: Date | null } {
  const staleLockout = user.lockedUntil !== null && user.lockedUntil.getTime() <= now.getTime();
  const currentCount = staleLockout ? 0 : user.failedLoginAttempts;
  const failedLoginAttempts = currentCount + 1;

  if (failedLoginAttempts >= LOCKOUT_THRESHOLD) {
    return {
      failedLoginAttempts,
      lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
    };
  }
  return { failedLoginAttempts, lockedUntil: null };
}

export const RESET_ATTEMPT_STATE = { failedLoginAttempts: 0, lockedUntil: null } as const;
