// Self-check ringkas — jalankan: npx tsx src/lib/auth-rules.test.ts
// Tiada framework; assert-based, fail cepat kalau logik lockout pecah.
import assert from "node:assert/strict";
import {
  isLocked,
  evaluateSuccessfulPassword,
  nextFailedAttemptState,
  LOCKOUT_THRESHOLD,
} from "./auth-rules";

const now = new Date("2026-07-20T12:00:00Z");

// isLocked
assert.equal(isLocked({ lockedUntil: null }, now), false);
assert.equal(isLocked({ lockedUntil: new Date(now.getTime() + 1000) }, now), true);
assert.equal(isLocked({ lockedUntil: new Date(now.getTime() - 1000) }, now), false);

// evaluateSuccessfulPassword — status disemak lepas password betul sahaja
assert.deepEqual(evaluateSuccessfulPassword({ status: "aktif" }), { outcome: "ok" });
assert.deepEqual(evaluateSuccessfulPassword({ status: "digantung" }), { outcome: "inactive" });
assert.deepEqual(evaluateSuccessfulPassword({ status: "tidak_aktif" }), { outcome: "inactive" });

// nextFailedAttemptState — kiraan naik, lockout pada percubaan ke-5
let state = { failedLoginAttempts: 0, lockedUntil: null as Date | null };
for (let i = 1; i < LOCKOUT_THRESHOLD; i++) {
  state = nextFailedAttemptState(state, now);
  assert.equal(state.failedLoginAttempts, i);
  assert.equal(state.lockedUntil, null, `percubaan ke-${i} tak patut lockout lagi`);
}
state = nextFailedAttemptState(state, now);
assert.equal(state.failedLoginAttempts, LOCKOUT_THRESHOLD);
assert.notEqual(state.lockedUntil, null, "percubaan ke-5 patut trigger lockout");
assert.equal(state.lockedUntil!.getTime(), now.getTime() + 15 * 60 * 1000);

// lockout lama yang dah lepas — kiraan reset, mula semula dari 1
const staleLockout = { failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() - 1000) };
const afterStale = nextFailedAttemptState(staleLockout, now);
assert.equal(afterStale.failedLoginAttempts, 1, "lockout lepas patut reset kiraan, bukan sambung");
assert.equal(afterStale.lockedUntil, null);

console.log("auth-rules.test.ts: semua assertion lulus");
