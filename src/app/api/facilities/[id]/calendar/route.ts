import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { facilities, venues } from "@/db/schema/aset";
import { calendarViewValues, toMalaysiaDateStr, type CalendarView } from "@/lib/calendar-rules";
import { loadFacilityCalendarBookings } from "@/lib/calendar-query";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Tiada sesi log masuk." }, { status: 401 });
  }

  const [facility] = await db
    .select({
      id: facilities.id,
      nama: facilities.nama,
      venueId: facilities.venueId,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
    })
    .from(facilities)
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(eq(facilities.id, params.id))
    .limit(1);
  if (!facility) {
    return Response.json({ error: "Fasiliti tidak dijumpai." }, { status: 404 });
  }

  const allowed = await can(session.user, "read", "booking", {
    venueId: facility.venueId,
    negeriId: facility.negeriId,
    daerahId: facility.daerahId ?? undefined,
  });
  if (!allowed) {
    return Response.json({ error: "Tiada akses." }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const viewParam = searchParams.get("view") ?? "mingguan";
  const view = (calendarViewValues as string[]).includes(viewParam) ? (viewParam as CalendarView) : "mingguan";
  const date = searchParams.get("date") ?? toMalaysiaDateStr(new Date());

  const bookings = await loadFacilityCalendarBookings(facility.id, view, date);

  return Response.json({
    facility: { id: facility.id, nama: facility.nama },
    view,
    date,
    bookings,
  });
}
