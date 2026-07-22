import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities } from "@/db/schema/aset";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";
import {
  calendarViewValues,
  viewRangeDates,
  shiftAnchor,
  startOfWeek,
  addCalendarDays,
  toMalaysiaDateStr,
  type CalendarView,
} from "@/lib/calendar-rules";
import { loadFacilityCalendarBookings, type CalendarBooking } from "@/lib/calendar-query";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  menunggu_kelulusan_pic: "secondary",
  menunggu_kelulusan_hq: "secondary",
  diluluskan: "default",
  perlu_pindah: "destructive",
};

function isView(v: string | undefined): v is CalendarView {
  return !!v && (calendarViewValues as string[]).includes(v);
}

function BookingRow({ booking, tf }: { booking: CalendarBooking; tf: Intl.DateTimeFormat }) {
  return (
    <Link
      href={`/aset/tempahan/${booking.id}`}
      className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
    >
      <span className="font-medium">
        {tf.format(booking.startTime)}–{tf.format(booking.endTime)}
      </span>
      <span>{booking.tujuan}</span>
      <Badge variant={STATUS_BADGE_VARIANT[booking.status] ?? "secondary"}>
        {ms.tempahan.status[booking.status as keyof typeof ms.tempahan.status] ?? booking.status}
      </Badge>
      <span className="ml-auto text-muted-foreground">{booking.requesterNama ?? "—"}</span>
    </Link>
  );
}

function HarianView({ bookings, tf }: { bookings: CalendarBooking[]; tf: Intl.DateTimeFormat }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">{ms.tempahan.kalendar.tiadaTempahan}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {bookings.map((b) => (
        <BookingRow key={b.id} booking={b} tf={tf} />
      ))}
    </div>
  );
}

function MingguanView({
  date,
  bookings,
  tf,
}: {
  date: string;
  bookings: CalendarBooking[];
  tf: Intl.DateTimeFormat;
}) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addCalendarDays(weekStart, i));
  return (
    <div className="flex flex-col gap-4">
      {days.map((day, i) => {
        const dayBookings = bookings.filter((b) => toMalaysiaDateStr(b.startTime) === day);
        return (
          <div key={day} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              {ms.tempahan.kalendar.hariSingkatan[i]} — {day}
            </h3>
            {dayBookings.length === 0 ? (
              <p className="pl-2 text-sm text-muted-foreground">{ms.tempahan.kalendar.tiadaTempahan}</p>
            ) : (
              <div className="flex flex-col gap-1.5 pl-2">
                {dayBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} tf={tf} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BulananView({
  date,
  bookings,
  venueId,
  facilityId,
}: {
  date: string;
  bookings: CalendarBooking[];
  venueId: string;
  facilityId: string;
}) {
  const { startDateStr: monthStart, endDateStr: monthEndExclusive } = viewRangeDates("bulanan", date);
  const lastDayOfMonth = addCalendarDays(monthEndExclusive, -1);
  const gridStart = startOfWeek(monthStart);
  const gridEndExclusive = addCalendarDays(startOfWeek(lastDayOfMonth), 7);

  const days: string[] = [];
  for (let d = gridStart; d < gridEndExclusive; d = addCalendarDays(d, 1)) {
    days.push(d);
  }
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const bookingsByDay = new Map<string, CalendarBooking[]>();
  for (const b of bookings) {
    const day = toMalaysiaDateStr(b.startTime);
    const existing = bookingsByDay.get(day);
    if (existing) existing.push(b);
    else bookingsByDay.set(day, [b]);
  }

  const currentMonth = monthStart.slice(0, 7);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {ms.tempahan.kalendar.hariSingkatan.map((h) => (
          <div key={h}>{h}</div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7 gap-1">
          {week.map((day) => {
            const dayBookings = bookingsByDay.get(day) ?? [];
            const inMonth = day.slice(0, 7) === currentMonth;
            return (
              <Link
                key={day}
                href={`/aset/premis/${venueId}/fasiliti/${facilityId}/kalendar?view=harian&date=${day}`}
                className={`min-h-20 rounded border p-1.5 text-xs hover:bg-muted/50 ${inMonth ? "" : "opacity-40"}`}
              >
                <div className="font-medium">{Number(day.slice(8, 10))}</div>
                {dayBookings.slice(0, 2).map((b) => (
                  <div key={b.id} className="truncate text-muted-foreground">
                    {b.tujuan}
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div className="text-muted-foreground">+{dayBookings.length - 2}</div>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default async function KalendarPage({
  params,
  searchParams,
}: {
  params: { id: string; facilityId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [venue] = await db
    .select({ id: venues.id, nama: venues.nama })
    .from(venues)
    .where(eq(venues.id, params.id))
    .limit(1);
  if (!venue) notFound();

  const facilityRows = await db
    .select({
      id: facilities.id,
      nama: facilities.nama,
      venueId: facilities.venueId,
      negeriId: venues.negeriId,
      daerahId: venues.daerahId,
    })
    .from(facilities)
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .where(eq(facilities.venueId, venue.id));

  const facility = facilityRows.find((f) => f.id === params.facilityId);
  if (!facility) notFound();

  if (
    !(await can(session.user, "read", "booking", {
      venueId: facility.venueId,
      negeriId: facility.negeriId,
      daerahId: facility.daerahId ?? undefined,
    }))
  ) {
    redirect(`/aset/premis/${venue.id}`);
  }

  const viewParam = typeof searchParams.view === "string" ? searchParams.view : undefined;
  const view: CalendarView = isView(viewParam) ? viewParam : "mingguan";
  const date = typeof searchParams.date === "string" ? searchParams.date : toMalaysiaDateStr(new Date());

  const bookings = await loadFacilityCalendarBookings(facility.id, view, date);

  const basePath = `/aset/premis/${venue.id}/fasiliti/${facility.id}/kalendar`;
  const prevHref = `${basePath}?view=${view}&date=${shiftAnchor(view, date, -1)}`;
  const nextHref = `${basePath}?view=${view}&date=${shiftAnchor(view, date, 1)}`;
  const todayHref = `${basePath}?view=${view}&date=${toMalaysiaDateStr(new Date())}`;

  const tf = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", timeStyle: "short" });
  const rangeLabelFormat = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "long" });
  const { startDateStr, endDateStr } = viewRangeDates(view, date);
  const rangeLabel =
    view === "harian"
      ? rangeLabelFormat.format(new Date(`${startDateStr}T00:00:00+08:00`))
      : `${rangeLabelFormat.format(new Date(`${startDateStr}T00:00:00+08:00`))} – ${rangeLabelFormat.format(
          new Date(`${addCalendarDays(endDateStr, -1)}T00:00:00+08:00`),
        )}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{facility.nama}</h1>
        <p className="text-sm text-muted-foreground">
          {venue.nama} · {ms.tempahan.kalendar.tajuk}
        </p>
      </div>

      {facilityRows.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">{ms.tempahan.kalendar.fasilitiLain}:</span>
          {facilityRows
            .filter((f) => f.id !== facility.id)
            .map((f) => (
              <Link
                key={f.id}
                href={`/aset/premis/${venue.id}/fasiliti/${f.id}/kalendar?view=${view}&date=${date}`}
                className="underline underline-offset-2"
              >
                {f.nama}
              </Link>
            ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {calendarViewValues.map((v) => (
            <Link
              key={v}
              href={`${basePath}?view=${v}&date=${date}`}
              className={`rounded border px-3 py-1 text-sm ${
                v === view ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              }`}
            >
              {ms.tempahan.kalendar.view[v]}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          <Link href={prevHref} className="rounded border px-3 py-1 text-sm hover:bg-muted/50">
            {ms.tempahan.kalendar.sebelum}
          </Link>
          <Link href={todayHref} className="rounded border px-3 py-1 text-sm hover:bg-muted/50">
            {ms.tempahan.kalendar.hariIni}
          </Link>
          <Link href={nextHref} className="rounded border px-3 py-1 text-sm hover:bg-muted/50">
            {ms.tempahan.kalendar.seterusnya}
          </Link>
        </div>
      </div>

      <p className="text-sm font-medium">{rangeLabel}</p>

      {view === "harian" && <HarianView bookings={bookings} tf={tf} />}
      {view === "mingguan" && <MingguanView date={date} bookings={bookings} tf={tf} />}
      {view === "bulanan" && (
        <BulananView date={date} bookings={bookings} venueId={venue.id} facilityId={facility.id} />
      )}
    </div>
  );
}
