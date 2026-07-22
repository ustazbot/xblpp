import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { switcherLinksFor } from "@/lib/host";
import { ms } from "@/constants/ms";

// Header dikongsi merentas semua page admin (aset/admin) — logo KEMAS +
// switcher Aset&Premis / Latihan. Route group (dashboard) TAK ubah URL,
// cuma kongsi layout untuk fail dalamnya (rujuk src/app/(dashboard)/aset,
// src/app/(dashboard)/admin). Portal peserta (/latihan/portal dsb) SENGAJA
// tak masuk sini — reka bentuk berlainan (mobile-first, bukan konsol admin).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const host = headers().get("host") ?? "";
  const links = switcherLinksFor(host);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="print-hide flex items-center justify-between border-b bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <Image src="/brand/kemas/Kemas Logo Vector.svg" alt="KEMAS" width={40} height={40} className="h-9 w-9" />
          <span className="font-display font-bold text-base">{ms.sistem.namaPendek}</span>
        </div>
        <nav className="flex gap-1">
          <Link
            href={links.aset}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            {ms.nav.aset}
          </Link>
          <Link
            href={links.lms}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            {ms.nav.latihan}
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
