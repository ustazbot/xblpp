import argon2 from "argon2";
import crypto from "crypto";

export const PASSWORD_MIN_LENGTH = 10;

// Password sementara bila admin cipta/reset akaun (forcePasswordChange=true
// selepas) — admin bacakan/hantar sekali sahaja (WhatsApp/telefon), TIDAK
// disimpan plaintext (rujuk caller: hash terus, tempPassword hanya dalam
// ActionState untuk paparan sekali). Set aksara elak keliru bila ditaip
// semula (tiada 0/O, 1/l/I).
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => TEMP_PASSWORD_ALPHABET[b % TEMP_PASSWORD_ALPHABET.length]).join("");
}

// argon2id — rujuk PRD Seksyen 7 (bukan argon2i/argon2d).
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

// Hash statik untuk elak timing-attack user enumeration — verify against ni
// bila email tak wujud, supaya response time sama ada email wujud atau tidak.
// Bukan password sebenar sesiapa; dijana sekali (argon2.hash("dummy-password-for-timing-safety")).
export const DUMMY_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$rKt6k4SBr7+UvmMZOP6sRA$v0F44H5WL1MyY79s+bAFWWBPAPztoB5OZ8uHD0ty+6E";
