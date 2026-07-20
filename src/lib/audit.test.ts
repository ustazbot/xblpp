// Self-check ringkas — jalankan: npx tsx src/lib/audit.test.ts
import assert from "node:assert/strict";
import { parseClientIp } from "./audit";

assert.equal(parseClientIp(null), null);
assert.equal(parseClientIp(""), null);
assert.equal(parseClientIp("203.0.113.5"), "203.0.113.5");
// X-Forwarded-For boleh ada rantaian proksi — ambil PERTAMA (client asal)
assert.equal(parseClientIp("203.0.113.5, 10.0.0.1, 10.0.0.2"), "203.0.113.5");
assert.equal(parseClientIp(" 203.0.113.5 ,10.0.0.1"), "203.0.113.5");

console.log("audit.test.ts: semua assertion lulus");
