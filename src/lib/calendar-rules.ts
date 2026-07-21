// Logik julat kalendar (harian/mingguan/bulanan) — pure functions, beroperasi
// atas string tarikh "YYYY-MM-DD" (tarikh KALENDAR Malaysia, bukan instant),
// TZ-independent (guna Date.UTC + getUTCDay/getUTCDate supaya betul tak kira
// TZ server jalan, rujuk nota "Malaysia timezone handling" Langkah 3/4). I/O
// (tukar ke Date sempadan +08:00 untuk query DB) tinggal di caller.
// Rujuk xBLPP-Struktur-Repo-Schema.md Seksyen 7 (Fasa 1a Langkah 8).

export type CalendarView = "harian" | "mingguan" | "bulanan";
export const calendarViewValues: CalendarView[] = ["harian", "mingguan", "bulanan"];

function parseDateStr(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// 0=Ahad..6=Sabtu — dikira daripada tarikh KALENDAR (Date.UTC), bukan
// getDay() pada Date instant (yang bergantung TZ runtime server).
export function calendarDayOfWeek(dateStr: string): number {
  const { y, m, d } = parseDateStr(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addCalendarDays(dateStr: string, days: number): string {
  const { y, m, d } = parseDateStr(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// Isnin = mula minggu (konvensyen kalendar institusi Malaysia).
export function startOfWeek(dateStr: string): string {
  const dow = calendarDayOfWeek(dateStr);
  const offsetFromMonday = dow === 0 ? 6 : dow - 1;
  return addCalendarDays(dateStr, -offsetFromMonday);
}

export function startOfMonth(dateStr: string): string {
  const { y, m } = parseDateStr(dateStr);
  return formatDateStr(y, m, 1);
}

// Julat separuh-buka [startDateStr, endDateStr) — padan konvensyen
// rangesOverlap/EXCLUDE constraint (booking-rules.ts).
export function viewRangeDates(view: CalendarView, anchorDateStr: string): { startDateStr: string; endDateStr: string } {
  if (view === "harian") {
    return { startDateStr: anchorDateStr, endDateStr: addCalendarDays(anchorDateStr, 1) };
  }
  if (view === "mingguan") {
    const start = startOfWeek(anchorDateStr);
    return { startDateStr: start, endDateStr: addCalendarDays(start, 7) };
  }
  const start = startOfMonth(anchorDateStr);
  const { y, m } = parseDateStr(start);
  const nextMonthStart = m === 12 ? formatDateStr(y + 1, 1, 1) : formatDateStr(y, m + 1, 1);
  return { startDateStr: start, endDateStr: nextMonthStart };
}

// Tarikh kalendar Malaysia (YYYY-MM-DD) bagi satu instant — guna untuk
// kelompok booking ikut hari pada paparan mingguan/bulanan.
export function toMalaysiaDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(date);
}

// Anchor seterusnya/sebelum untuk navigasi Prev/Next — clamp hari ke hari
// terakhir bulan sasaran untuk view bulanan (elak rollover, sama isu macam
// addMonthsClamped di booking-rules.ts).
export function shiftAnchor(view: CalendarView, anchorDateStr: string, steps: number): string {
  if (view === "harian") return addCalendarDays(anchorDateStr, steps);
  if (view === "mingguan") return addCalendarDays(anchorDateStr, steps * 7);
  const { y, m, d } = parseDateStr(anchorDateStr);
  const targetFirst = new Date(Date.UTC(y, m - 1 + steps, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return formatDateStr(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, Math.min(d, lastDayOfTargetMonth));
}
