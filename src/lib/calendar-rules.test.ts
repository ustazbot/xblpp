// Self-check ringkas — jalankan: npx tsx src/lib/calendar-rules.test.ts
import assert from "node:assert/strict";
import {
  calendarDayOfWeek,
  addCalendarDays,
  startOfWeek,
  startOfMonth,
  viewRangeDates,
  shiftAnchor,
} from "./calendar-rules";

// calendarDayOfWeek — 2026-07-21 ialah Selasa (2)
assert.equal(calendarDayOfWeek("2026-07-21"), 2, "2026-07-21 Selasa");
assert.equal(calendarDayOfWeek("2026-07-19"), 0, "2026-07-19 Ahad");
assert.equal(calendarDayOfWeek("2026-07-25"), 6, "2026-07-25 Sabtu");

// addCalendarDays — rentas sempadan bulan
assert.equal(addCalendarDays("2026-07-30", 3), "2026-08-02");
assert.equal(addCalendarDays("2026-08-02", -3), "2026-07-30");

// startOfWeek — Isnin = mula minggu
assert.equal(startOfWeek("2026-07-21"), "2026-07-20", "Selasa -> Isnin sebelumnya");
assert.equal(startOfWeek("2026-07-19"), "2026-07-13", "Ahad -> Isnin minggu sebelum (offset 6)");
assert.equal(startOfWeek("2026-07-20"), "2026-07-20", "Isnin itu sendiri -> tiada anjakan");

// startOfMonth
assert.equal(startOfMonth("2026-07-21"), "2026-07-01");

// viewRangeDates — julat separuh-buka [start, end)
assert.deepEqual(viewRangeDates("harian", "2026-07-21"), { startDateStr: "2026-07-21", endDateStr: "2026-07-22" });
assert.deepEqual(viewRangeDates("mingguan", "2026-07-21"), { startDateStr: "2026-07-20", endDateStr: "2026-07-27" });
assert.deepEqual(viewRangeDates("bulanan", "2026-07-21"), { startDateStr: "2026-07-01", endDateStr: "2026-08-01" });
assert.deepEqual(
  viewRangeDates("bulanan", "2026-12-15"),
  { startDateStr: "2026-12-01", endDateStr: "2027-01-01" },
  "Disember -> Januari tahun depan",
);

// shiftAnchor
assert.equal(shiftAnchor("harian", "2026-07-21", 1), "2026-07-22");
assert.equal(shiftAnchor("harian", "2026-07-21", -1), "2026-07-20");
assert.equal(shiftAnchor("mingguan", "2026-07-21", 1), "2026-07-28");
assert.equal(shiftAnchor("bulanan", "2026-07-21", 1), "2026-08-21");
assert.equal(shiftAnchor("bulanan", "2026-01-31", 1), "2026-02-28", "clamp Feb bukan leap year");
assert.equal(shiftAnchor("bulanan", "2026-01-31", -1), "2025-12-31");

console.log("calendar-rules.test.ts: semua assertion lulus");
