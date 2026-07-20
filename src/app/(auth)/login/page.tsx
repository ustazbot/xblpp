import { ms } from "@/constants/ms";

// Borang login sebenar (Auth.js Credentials) dibina di Langkah 4 — ini skeleton route.
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-xl font-semibold">{ms.auth.login}</h1>
    </main>
  );
}
