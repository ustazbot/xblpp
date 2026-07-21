// Self-check ringkas — jalankan: npx tsx src/lib/booking-rules.test.ts
import assert from "node:assert/strict";
import {
  addBusinessDays,
  needsAdminNegeriApproval,
  isPastBooking,
  rangesOverlap,
  SLA_BUSINESS_DAYS,
  addMonthsClamped,
  generateRecurringOccurrences,
  currentApprovalStage,
  nextStatusOnApprove,
  isBookingAffectedByMaintenance,
  daysUntil,
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

// addMonthsClamped — kes biasa
const mac15 = new Date("2026-03-15T10:00:00+08:00");
const apr15 = addMonthsClamped(mac15, 1);
assert.equal(apr15.toISOString().slice(0, 10), "2026-04-15", "15hb bulan biasa, tiada clamp perlu");

// addMonthsClamped — kes clamp SEBENAR: 31 Jan + 1 bulan mesti jadi 28 Feb
// (2027 bukan leap year), BUKAN "3 Mac" (JS Date rollover lalai, silap).
const jan31 = new Date("2027-01-31T09:00:00+08:00");
const clampedFeb = addMonthsClamped(jan31, 1);
assert.equal(clampedFeb.toISOString().slice(0, 10), "2027-02-28", "31 Jan +1 bulan -> clamp ke 28 Feb (bukan rollover Mac)");
assert.equal(clampedFeb.getUTCHours(), jan31.getUTCHours(), "masa (jam) dikekalkan selepas clamp");

// addMonthsClamped — leap year: 31 Jan 2028 + 1 bulan -> 29 Feb (2028 leap year)
const jan31Leap = new Date("2028-01-31T09:00:00+08:00");
const clampedFebLeap = addMonthsClamped(jan31Leap, 1);
assert.equal(clampedFebLeap.toISOString().slice(0, 10), "2028-02-29", "31 Jan 2028 (leap) +1 bulan -> 29 Feb");

// generateRecurringOccurrences — mingguan: 4 kejadian, +7 hari setiap satu,
// tempoh (durasi) dikekalkan.
const weeklyStart = new Date("2026-08-04T10:00:00+08:00"); // Selasa
const weeklyEnd = new Date("2026-08-04T12:00:00+08:00");
const weekly = generateRecurringOccurrences(weeklyStart, weeklyEnd, "mingguan", 4);
assert.equal(weekly.length, 4);
assert.equal(weekly[0].startTime.toISOString().slice(0, 10), "2026-08-04");
assert.equal(weekly[1].startTime.toISOString().slice(0, 10), "2026-08-11");
assert.equal(weekly[2].startTime.toISOString().slice(0, 10), "2026-08-18");
assert.equal(weekly[3].startTime.toISOString().slice(0, 10), "2026-08-25");
for (const occ of weekly) {
  assert.equal(occ.endTime.getTime() - occ.startTime.getTime(), 2 * 60 * 60 * 1000, "tempoh 2 jam dikekalkan setiap kejadian");
}

// generateRecurringOccurrences — bulanan: guna tarikh 31hb, sahkan clamp
// terpakai automatik pada kejadian yang jatuh bulan pendek.
const monthlyStart = new Date("2026-01-31T14:00:00+08:00");
const monthlyEnd = new Date("2026-01-31T16:00:00+08:00");
const monthly = generateRecurringOccurrences(monthlyStart, monthlyEnd, "bulanan", 3);
assert.equal(monthly.length, 3);
assert.equal(monthly[0].startTime.toISOString().slice(0, 10), "2026-01-31");
assert.equal(monthly[1].startTime.toISOString().slice(0, 10), "2026-02-28", "Feb 2026 bukan leap year, clamp ke 28");
assert.equal(monthly[2].startTime.toISOString().slice(0, 10), "2026-03-31", "Mac balik ke 31 (bukan terjejas clamp Feb)");

// currentApprovalStage / nextStatusOnApprove
assert.equal(currentApprovalStage("menunggu_kelulusan_pic"), "pic");
assert.equal(currentApprovalStage("menunggu_kelulusan_hq"), "hq");
assert.equal(currentApprovalStage("diluluskan"), null, "status selesai — tiada peringkat menunggu");
assert.equal(currentApprovalStage("ditolak"), null);
assert.equal(currentApprovalStage("dibatalkan"), null);
assert.equal(currentApprovalStage("perlu_pindah"), null);
assert.equal(nextStatusOnApprove("pic"), "menunggu_kelulusan_hq");
assert.equal(nextStatusOnApprove("hq"), "diluluskan");

// isBookingAffectedByMaintenance
const mNow = new Date("2026-07-21T00:00:00Z");
assert.equal(
  isBookingAffectedByMaintenance(
    { startTime: new Date("2026-07-20T00:00:00Z"), endTime: new Date("2026-07-20T02:00:00Z") },
    mNow,
    null,
  ),
  false,
  "booking dah lepas — tak terjejas",
);
assert.equal(
  isBookingAffectedByMaintenance(
    { startTime: new Date("2026-08-01T00:00:00Z"), endTime: new Date("2026-08-01T02:00:00Z") },
    mNow,
    null,
  ),
  true,
  "maintenanceUntil null — semua booking akan datang terjejas",
);
assert.equal(
  isBookingAffectedByMaintenance(
    { startTime: new Date("2026-08-01T00:00:00Z"), endTime: new Date("2026-08-01T02:00:00Z") },
    mNow,
    new Date("2026-07-31T23:59:59Z"),
  ),
  false,
  "booking mula SELEPAS tamat maintenance — tak terjejas",
);
assert.equal(
  isBookingAffectedByMaintenance(
    { startTime: new Date("2026-07-25T00:00:00Z"), endTime: new Date("2026-07-25T02:00:00Z") },
    mNow,
    new Date("2026-07-31T23:59:59Z"),
  ),
  true,
  "booking mula dalam tempoh maintenance — terjejas",
);

// daysUntil
assert.equal(daysUntil(new Date("2026-07-24T10:00:00Z"), new Date("2026-07-21T10:00:00Z")), 3);
assert.equal(daysUntil(new Date("2026-07-21T10:00:00Z"), new Date("2026-07-21T10:00:00Z")), 0);
assert.equal(daysUntil(new Date("2026-07-19T10:00:00Z"), new Date("2026-07-21T10:00:00Z")), -2, "tarikh dah lepas — negatif (tertunggak)");

console.log("booking-rules.test.ts: semua assertion lulus");
