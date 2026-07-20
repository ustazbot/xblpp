import { ms } from "@/constants/ms";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-xl font-semibold">{ms.sistem.nama}</h1>
      <LoginForm />
    </main>
  );
}
