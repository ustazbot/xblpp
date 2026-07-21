import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues } from "@/db/schema/aset";
import { negeri, daerah, users, roles, userRoles } from "@/db/schema/core";
import { ms } from "@/constants/ms";
import { hasManageRole } from "../../manage-roles";
import { VenueForm } from "../../venue-form";
import { updateVenue } from "../../actions";

export default async function EditPremisPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (
    !hasManageRole(session.user.roles) ||
    !(await can(session.user, "update", "venue", { venueId: params.id }))
  ) {
    redirect(`/aset/premis/${params.id}`);
  }

  const [venue] = await db.select().from(venues).where(eq(venues.id, params.id)).limit(1);
  if (!venue) notFound();

  const [negeriRows, daerahRows, picRows] = await Promise.all([
    db.select({ id: negeri.id, nama: negeri.nama }).from(negeri).orderBy(negeri.nama),
    db
      .select({ id: daerah.id, nama: daerah.nama, negeriKod: negeri.kod })
      .from(daerah)
      .innerJoin(negeri, eq(daerah.negeriId, negeri.id))
      .orderBy(daerah.nama),
    db
      .select({ id: users.id, nama: users.nama, email: users.email })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(roles.code, "pic_premis")),
  ]);

  const updateVenueWithId = updateVenue.bind(null, venue.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{ms.aset.editPremis}</h1>
      <VenueForm
        action={updateVenueWithId}
        negeriList={negeriRows.map((n) => ({ id: n.id, label: n.nama }))}
        daerahList={daerahRows.map((d) => ({ id: d.id, label: `${d.nama} (${d.negeriKod})` }))}
        picCandidates={picRows.map((p) => ({ id: p.id, label: `${p.nama} (${p.email})` }))}
        defaultValues={{
          nama: venue.nama,
          jenis: venue.jenis,
          alamat: venue.alamat,
          negeriId: venue.negeriId,
          daerahId: venue.daerahId,
          googleMapsUrl: venue.googleMapsUrl,
          picUserId: venue.picUserId,
          status: venue.status,
        }}
        submitLabel={ms.aset.kemaskini}
      />
    </div>
  );
}
