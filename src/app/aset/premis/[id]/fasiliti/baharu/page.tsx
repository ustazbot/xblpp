import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues } from "@/db/schema/aset";
import { ms } from "@/constants/ms";
import { hasManageRole } from "../../../manage-roles";
import { FacilityForm } from "../../facility-form";
import { createFacility } from "../../../actions";

export default async function TambahFasilitiPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasManageRole(session.user.roles) || !(await can(session.user, "create", "facility"))) {
    redirect(`/aset/premis/${params.id}`);
  }

  const [venue] = await db.select({ id: venues.id, nama: venues.nama }).from(venues).where(eq(venues.id, params.id)).limit(1);
  if (!venue) notFound();

  const createFacilityForVenue = createFacility.bind(null, venue.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        {ms.aset.tambahFasiliti} — {venue.nama}
      </h1>
      <FacilityForm action={createFacilityForVenue} submitLabel={ms.aset.simpan} />
    </div>
  );
}
