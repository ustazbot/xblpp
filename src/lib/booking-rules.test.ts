// Self-check ringkas — jalankan: npx tsx src/lib/booking-rules.test.ts
import assert from "node:assert/strict";
import {
  addBusinessDays,
  needsAdminNegeriApproval,
  isPastBooking,
  rangesOverlap,
  SLA_BUSINESS_DAYS,
} from "./booking-rules";

// addBusinessDays — langkau hujung minggu
// Selasa 2026-07-21 + 3 hari bekerja = Jumaat 2026-07-24 (Rabu,Khamis,Jumaat)
const selasa = new Date("2026-07-21T00:00:00Z");
const jumaat = addBusinessDays(selasa, SLA_BUSINESS_DAYS);
assert.equal(jumaat.toISOString().slice(0, 10), "2026-07-24");

// Khamis + 3 hari bekerja = Selasa depan (Jumaat, Isnin, Selasa — langkau Sabtu/Ahad)
const khamis = new Date("2026-07-23T00:00:00Z");
const selasaDepan = addBusinessDays(khamis, SLA_BUSINESS_DAYS);
assert.equal(selasaDepan.toISOString().slice(0, 10), "2026-07-28");

// needsAdminNegeriApproval — >12 bulan ke hadapan
const now = new Date("2026-07-21T00:00:00Z");
assert.equal(needsAdminNegeriApproval(new Date("2026-08-01T00:00:00Z"), now), false, "1 bulan depan tak perlu");
assert.equal(needsAdminNegeriApproval(new Date("2027-06-01T00:00:00Z"), now), false, "11 bulan depan tak perlu");
assert.equal(needsAdminNegeriApproval(new Date("2027-08-01T00:00:00Z"), now), true, "13 bulan depan PERLU");
assert.equal(needsAdminNegeriApproval(new Date("2027-07-20T00:00:00Z"), now), false, "tepat-tepat bawah 12 bulan");

// isPastBooking
assert.equal(isPastBooking(new Date("2026-07-20T00:00:00Z"), now), true, "semalam = lampau");
assert.equal(isPastBooking(new Date("2026-07-22T00:00:00Z"), now), false, "esok = bukan lampau");

// rangesOverlap — padan semantik EXCLUDE '[)' (Langkah 1)
// 10am-12pm vs 11am-1pm — bertindih
assert.equal(
  rangesOverlap(
    new Date("2026-08-01T10:00:00+08:00"),
    new Date("2026-08-01T12:00:00+08:00"),
    new Date("2026-08-01T11:00:00+08:00"),
    new Date("2026-08-01T13:00:00+08:00"),
  ),
  true,
);
// 10am-12pm vs 12pm-2pm — bersebelahan, BUKAN bertindih (bound '[)')
assert.equal(
  rangesOverlap(
    new Date("2026-08-01T10:00:00+08:00"),
    new Date("2026-08-01T12:00:00+08:00"),
    new Date("2026-08-01T12:00:00+08:00"),
    new Date("2026-08-01T14:00:00+08:00"),
  ),
  false,
);
// tiada overlap langsung
assert.equal(
  rangesOverlap(
    new Date("2026-08-01T10:00:00+08:00"),
    new Date("2026-08-01T11:00:00+08:00"),
    new Date("2026-08-01T14:00:00+08:00"),
    new Date("2026-08-01T15:00:00+08:00"),
  ),
  false,
);

console.log("booking-rules.test.ts: semua assertion lulus");
