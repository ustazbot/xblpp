import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ms } from "@/constants/ms";

// Placeholder apex (blppkemas.com root) — awam, tiada auth (rujuk
// src/middleware.ts). Bina URL aset./lms. drpd host request semasa supaya
// betul pada prod (blppkemas.com) DAN staging tanpa perlu env var berasingan
// (apex sendiri tiada varian staging — rujuk EXECUTION PLAN Task 1).
export default function ApexPage() {
  const host = headers().get("host") ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <Image
        src="/brand/kemas/Kemas Logo Vector.svg"
        alt="KEMAS"
        width={500}
        height={500}
        className="h-32 w-32 sm:h-40 sm:w-40"
        priority
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{ms.apex.tajuk}</h1>
        <p className="text-muted-foreground">{ms.apex.keterangan}</p>
      </div>
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href={`https://aset.${host}`}>{ms.apex.butangAset}</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href={`https://lms.${host}`}>{ms.apex.butangLatihan}</Link>
        </Button>
      </div>
    </main>
  );
}
