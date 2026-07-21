import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { facilities, venues } from "@/db/schema/aset";
import { ms } from "@/constants/ms";
import { RecurringBookingForm } from "../recurring-booking-form";
import { createRecurringBooking } from "../actions";

export default async function TempahBerulangPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Senarai fasiliti TIDAK ditapis ikut skop di sini (elak duplikasi logik
  // scopeMatches dalam query) — createRecurringBooking() semak can() sebenar
  // semasa submit, tolak dengan mesej jelas kalau di luar skop pemohon.
  const facilityRows = await db
    .select({ id: facilities.id, nama: facilities.nama, venueNama: venues.nama })
    .from(facilities)
    .innerJoin(venues, eq(facilities.venueId, venues.id))
    .orderBy(venues.nama, facilities.nama);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{ms.tempahan.tempahBerulang}</h1>
      <RecurringBookingForm
        action={createRecurringBooking}
        facilityOptions={facilityRows.map((f) => ({ id: f.id, label: `${f.nama} — ${f.venueNama}` }))}
      />
    </div>
  );
}
