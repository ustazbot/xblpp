import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/db";
import { venues } from "@/db/schema/aset";
import { negeri, daerah } from "@/db/schema/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ms } from "@/constants/ms";
import { hasManageRole } from "./manage-roles";

export default async function PremisPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rows = await db
    .select({
      id: venues.id,
      nama: venues.nama,
      jenis: venues.jenis,
      status: venues.status,
      negeriNama: negeri.nama,
      daerahNama: daerah.nama,
    })
    .from(venues)
    .leftJoin(negeri, eq(venues.negeriId, negeri.id))
    .leftJoin(daerah, eq(venues.daerahId, daerah.id))
    .orderBy(venues.nama);

  const canCreate = hasManageRole(session.user.roles) && (await can(session.user, "create", "venue"));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{ms.aset.premis}</h1>
        {canCreate && (
          <Button asChild>
            <Link href="/aset/premis/baharu">{ms.aset.tambahPremis}</Link>
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">{ms.aset.labelNama}</th>
              <th className="p-3 font-medium">{ms.aset.labelJenis}</th>
              <th className="p-3 font-medium">{ms.aset.labelNegeri}</th>
              <th className="p-3 font-medium">{ms.aset.labelDaerah}</th>
              <th className="p-3 font-medium">{ms.aset.labelStatus}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-3">
                  <Link href={`/aset/premis/${v.id}`} className="font-medium underline-offset-2 hover:underline">
                    {v.nama}
                  </Link>
                </td>
                <td className="p-3">{ms.aset.jenisVenue[v.jenis]}</td>
                <td className="p-3">{v.negeriNama}</td>
                <td className="p-3">{v.daerahNama ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={v.status === "aktif" ? "default" : "secondary"}>
                    {ms.aset.statusVenue[v.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
