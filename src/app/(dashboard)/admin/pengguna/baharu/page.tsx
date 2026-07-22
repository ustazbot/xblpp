import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isHqAdmin } from "@/lib/rbac";
import { db } from "@/db";
import { roles, negeri, daerah } from "@/db/schema/core";
import { venues } from "@/db/schema/aset";
import { ms } from "@/constants/ms";
import { CreateUserForm } from "../../create-user-form";

export default async function CiptaPenggunaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isHqAdmin(session.user.roles)) redirect("/");

  const [roleRows, negeriRows, daerahRows, venueRows] = await Promise.all([
    db.select({ code: roles.code, nama: roles.nama }).from(roles).orderBy(roles.nama),
    db.select({ id: negeri.id, nama: negeri.nama }).from(negeri).orderBy(negeri.nama),
    db
      .select({ id: daerah.id, nama: daerah.nama, negeriKod: negeri.kod })
      .from(daerah)
      .innerJoin(negeri, eq(daerah.negeriId, negeri.id))
      .orderBy(daerah.nama),
    db.select({ id: venues.id, nama: venues.nama }).from(venues).orderBy(venues.nama),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display font-bold text-2xl">{ms.admin.pengguna.ciptaPengguna}</h1>
      <CreateUserForm
        roleList={roleRows.map((r) => ({ code: r.code, label: r.nama }))}
        negeriList={negeriRows.map((n) => ({ id: n.id, label: n.nama }))}
        daerahList={daerahRows.map((d) => ({ id: d.id, label: `${d.nama} (${d.negeriKod})` }))}
        venueList={venueRows.map((v) => ({ id: v.id, label: v.nama }))}
      />
    </div>
  );
}
