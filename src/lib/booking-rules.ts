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

// Langkah 4 — Recurring booking.
export const recurringPatternValues = ["mingguan", "bulanan"] as const;
// Had selamat elak silap taip (cth. 500 kiraan) jana beratus tempahan tanpa
// sengaja — 52 mingguan ~ 1 tahun, 24 bulanan ~ 2 tahun (cukup generous untuk
// kelas berkala biasa, PRD tak nyatakan had khusus).
export const MAX_RECURRING_COUNT = 52;

// Tambah bulan dengan CLAMP hari ke hari terakhir bulan sasaran kalau hari
// asal tak wujud (cth. 31 Jan + 1 bulan -> 28/29 Feb, BUKAN "3 Mac" — JS Date
// punya tingkah laku setMonth() default rollover ke bulan seterusnya, silap
// untuk tempahan berkala). set ke hari 1 dulu sebelum ubah bulan supaya
// pengiraan bulan sasaran sendiri tak terjejas oleh rollover hari asal.
export function addMonthsClamped(date: Date, months: number): Date {
  const originalDay = date.getDate();
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  result.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return result;
}

export interface BookingOccurrence {
  startTime: Date;
  endTime: Date;
}

// Jana N kejadian daripada tempahan pertama (kekuda tarikh+masa+tempoh),
// mingguan (+7 hari setiap kejadian) atau bulanan (+1 bulan, clamp hari —
// rujuk addMonthsClamped). Pure — tiada IO, konflik/kelulusan disemak per
// kejadian oleh caller (actions.ts).
export function generateRecurringOccurrences(
  startTime: Date,
  endTime: Date,
  pattern: (typeof recurringPatternValues)[number],
  count: number,
): BookingOccurrence[] {
  const occurrences: BookingOccurrence[] = [];
  for (let i = 0; i < count; i++) {
    if (pattern === "mingguan") {
      const start = new Date(startTime);
      const end = new Date(endTime);
      start.setDate(start.getDate() + i * 7);
      end.setDate(end.getDate() + i * 7);
      occurrences.push({ startTime: start, endTime: end });
    } else {
      occurrences.push({
        startTime: addMonthsClamped(startTime, i),
        endTime: addMonthsClamped(endTime, i),
      });
    }
  }
  return occurrences;
}

// Langkah 5 — Approval workflow dwi-peringkat (keputusan Langkah 3.5).
export type ApprovalStage = "pic" | "hq";

// Tentukan peringkat kelulusan SEMASA daripada status booking — null kalau
// booking bukan dalam status "menunggu kelulusan" (dah diluluskan/ditolak/
// dibatalkan/perlu_pindah — tiada tindakan lulus/tolak sah pada status ni).
export function currentApprovalStage(status: string): ApprovalStage | null {
  if (status === "menunggu_kelulusan_pic") return "pic";
  if (status === "menunggu_kelulusan_hq") return "hq";
  return null;
}

// Status seterusnya bila LULUS pada peringkat semasa — PIC lulus -> giliran
// HQ; HQ lulus -> diluluskan penuh (tiada peringkat lain).
export function nextStatusOnApprove(stage: ApprovalStage): "menunggu_kelulusan_hq" | "diluluskan" {
  return stage === "pic" ? "menunggu_kelulusan_hq" : "diluluskan";
}

// Langkah 6 — Maintenance workflow. Tempahan "terjejas" = booking yang masih
// akan berlaku (endTime > now) DAN bertindih dengan tempoh penyelenggaraan
// [now, maintenanceUntil]. maintenanceUntil=null bermaksud tiada tarikh
// tamat ditetapkan — semua tempahan akan datang pada fasiliti ni terjejas.
export function isBookingAffectedByMaintenance(
  occurrence: BookingOccurrence,
  now: Date,
  maintenanceUntil: Date | null,
): boolean {
  if (occurrence.endTime.getTime() <= now.getTime()) return false;
  if (maintenanceUntil === null) return true;
  return occurrence.startTime.getTime() <= maintenanceUntil.getTime();
}
