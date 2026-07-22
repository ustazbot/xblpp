import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isHqAdmin } from "@/lib/rbac";
import { db } from "@/db";
import { users, roles, userRoles } from "@/db/schema/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ms } from "@/constants/ms";
import { ResetPasswordButton } from "./reset-password-button";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isHqAdmin(session.user.roles)) redirect("/");

  const userRows = await db
    .select({
      id: users.id,
      nama: users.nama,
      email: users.email,
      status: users.status,
      roleNama: roles.nama,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .orderBy(users.nama);

  // Satu pengguna boleh ada >1 baris user_roles — kumpul nama role per
  // pengguna di sini (JS), bukan array_agg SQL, sama pattern query lain
  // dalam repo ni (proses join flat di JS, elak SQL agregat kompleks).
  const rolesByUser = new Map<string, string[]>();
  for (const row of userRows) {
    if (!row.roleNama) continue;
    const existing = rolesByUser.get(row.id) ?? [];
    if (!existing.includes(row.roleNama)) existing.push(row.roleNama);
    rolesByUser.set(row.id, existing);
  }
  const uniqueUsers = Array.from(new Map(userRows.map((u) => [u.id, u])).values());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">{ms.admin.pengguna.tajuk}</h1>
        <Button asChild>
          <Link href="/admin/pengguna/baharu">+ {ms.admin.pengguna.ciptaPengguna}</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display font-bold text-lg">{ms.admin.pengguna.senarai}</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">{ms.admin.pengguna.lajurNama}</th>
                <th className="p-3 font-medium">{ms.admin.pengguna.lajurEmel}</th>
                <th className="p-3 font-medium">{ms.admin.pengguna.lajurRole}</th>
                <th className="p-3 font-medium">{ms.admin.pengguna.lajurStatus}</th>
                <th className="p-3 font-medium">{ms.admin.pengguna.lajurTindakan}</th>
              </tr>
            </thead>
            <tbody>
              {uniqueUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.nama}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{(rolesByUser.get(u.id) ?? []).join(", ") || "—"}</td>
                  <td className="p-3">
                    <Badge variant={u.status === "aktif" ? "approved" : "draft"}>{u.status}</Badge>
                  </td>
                  <td className="p-3">
                    <ResetPasswordButton userId={u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
