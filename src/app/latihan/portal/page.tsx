import { ms } from "@/constants/ms";

// Portal peserta (mobile-first) — dikecualikan dari middleware admin/PIC (rujuk lib/rbac.ts, Langkah 5).
export default function PortalPage() {
  return <h1 className="text-xl font-semibold">{ms.latihan.portal}</h1>;
}
