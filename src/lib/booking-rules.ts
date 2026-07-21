// Logik keputusan tempahan — pure functions, tiada DB/IO, supaya boleh diuji
// tanpa Postgres. I/O (query konflik, INSERT) tinggal di
// src/app/aset/tempahan/actions.ts. Rujuk PRD Modul 2 business rules +
// xBLPP-Struktur-Repo-Schema.md Seksyen 7 (Fasa 1a Langkah 3).

export const SLA_BUSINESS_DAYS = 3;
export const ADVANCE_BOOKING_MONTHS = 12;

// SLA kelulusan 3 hari BEKERJA — langkau Sabtu/Ahad. Tak kira cuti umum
// (kalendar cuti KEMAS tak tersedia sebagai data berstruktur buat masa ini,
// hanya Isnin-Jumaat ikut definisi "hari bekerja" konsisten dengan guard
// deploy staging Langkah 10).
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay(); // 0=Ahad, 6=Sabtu
    if (dow !== 0 && dow !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

// >12 bulan ke hadapan perlu kelulusan Admin Negeri (bukan PIC sahaja).
export function needsAdminNegeriApproval(startTime: Date, now: Date): boolean {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() + ADVANCE_BOOKING_MONTHS);
  return startTime.getTime() > cutoff.getTime();
}

// Tempahan tarikh lampau dilarang.
export function isPastBooking(startTime: Date, now: Date): boolean {
  return startTime.getTime() < now.getTime();
}

// Overlap dua julat separuh-buka [aStart,aEnd) dan [bStart,bEnd) — formula
// standard, padan semantik constraint EXCLUDE '[)' (Langkah 1). Guna untuk
// app-layer pre-check SEBELUM query DB (UX awal, mesej Melayu mesra) — DB
// EXCLUDE constraint kekal backstop sebenar untuk race condition.
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
