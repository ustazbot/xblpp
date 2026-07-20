import { ms } from "@/constants/ms";

// Dua pintu: Aset & Premis / Latihan — role menentukan akses (rujuk lib/rbac.ts, Langkah 5).
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">{ms.sistem.nama}</h1>
      <div className="flex gap-4">
        <a href="/aset" className="rounded border px-4 py-2">
          {ms.nav.aset}
        </a>
        <a href="/latihan" className="rounded border px-4 py-2">
          {ms.nav.latihan}
        </a>
      </div>
    </main>
  );
}
