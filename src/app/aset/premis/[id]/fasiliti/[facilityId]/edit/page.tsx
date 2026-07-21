import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues, facilities } from "@/db/schema/aset";
import { ms } from "@/constants/ms";
import { hasManageRole } from "../../../../manage-roles";
import { FacilityForm } from "../../../facility-form";
import { updateFacility } from "../../../../actions";

export default async function EditFasilitiPage({
  params,
}: {
  params: { id: string; facilityId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (
    !hasManageRole(session.user.roles) ||
    !(await can(session.user, "update", "facility", { venueId: params.id }))
  ) {
    redirect(`/aset/premis/${params.id}`);
  }

  const [venue] = await db
    .select({ id: venues.id, nama: venues.nama })
    .from(venues)
    .where(eq(venues.id, params.id))
    .limit(1);
  if (!venue) notFound();

  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, params.facilityId))
    .limit(1);
  if (!facility || facility.venueId !== venue.id) notFound();

  const updateFacilityForVenue = updateFacility.bind(null, venue.id, facility.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        {ms.aset.editFasiliti} — {facility.nama}
      </h1>
      <FacilityForm
        action={updateFacilityForVenue}
        defaultValues={{
          nama: facility.nama,
          jenis: facility.jenis,
          kapasiti: facility.kapasiti,
          status: facility.status,
        }}
        submitLabel={ms.aset.kemaskini}
      />
    </div>
  );
}
