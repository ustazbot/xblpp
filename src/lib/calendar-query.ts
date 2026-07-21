// Query kongsi antara /api/facilities/[id]/calendar (route handler) dan
// halaman kalendar server component — elak duplikasi logik julat+overlap.
import { eq, and, lt, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { venueBookings } from "@/db/schema/aset";
import { users } from "@/db/schema/core";
import { viewRangeDates, type CalendarView } from "./calendar-rules";

// Status yang "berlaku sebenar" pada kalendar — tak termasuk ditolak/
// dibatalkan (elak kekeliruan papar slot yang dah tak relevan). Padan
// ACTIVE_BOOKING_STATUSES (tempahan/actions.ts) tanpa perlu import silang
// "use server" module.
const CALENDAR_VISIBLE_STATUSES = [
  "menunggu_kelulusan_pic",
  "menunggu_kelulusan_hq",
  "diluluskan",
  "perlu_pindah",
] as const;

export interface CalendarBooking {
  id: string;
  tujuan: string;
  status: string;
  startTime: Date;
  endTime: Date;
  requesterNama: string | null;
}

export async function loadFacilityCalendarBookings(
  facilityId: string,
  view: CalendarView,
  anchorDateStr: string,
): Promise<CalendarBooking[]> {
  const { startDateStr, endDateStr } = viewRangeDates(view, anchorDateStr);
  const rangeStart = new Date(`${startDateStr}T00:00:00+08:00`);
  const rangeEnd = new Date(`${endDateStr}T00:00:00+08:00`);

  return db
    .select({
      id: venueBookings.id,
      tujuan: venueBookings.tujuan,
      status: venueBookings.status,
      startTime: venueBookings.startTime,
      endTime: venueBookings.endTime,
      requesterNama: users.nama,
    })
    .from(venueBookings)
    .leftJoin(users, eq(venueBookings.requestedBy, users.id))
    .where(
      and(
        eq(venueBookings.facilityId, facilityId),
        inArray(venueBookings.status, CALENDAR_VISIBLE_STATUSES),
        lt(venueBookings.startTime, rangeEnd),
        gt(venueBookings.endTime, rangeStart),
      ),
    )
    .orderBy(venueBookings.startTime);
}
