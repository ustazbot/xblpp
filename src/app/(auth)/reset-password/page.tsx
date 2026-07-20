import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ms } from "@/constants/ms";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex max-w-sm flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold">{ms.auth.resetKataLaluan}</h1>
        <p className="text-sm text-muted-foreground">{ms.auth.resetKataLaluanKeterangan}</p>
      </div>
      <ResetPasswordForm />
    </main>
  );
}
