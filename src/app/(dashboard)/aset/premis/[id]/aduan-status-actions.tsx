"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ms } from "@/constants/ms";
import {
  markAduanDalamTindakan,
  markAduanSelesai,
  aduanActionInitialState,
  type AduanActionState,
} from "./aduan-actions";

function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "..." : label}
    </Button>
  );
}

export function AduanStatusActions({
  venueId,
  aduanId,
  status,
}: {
  venueId: string;
  aduanId: string;
  status: "dilaporkan" | "dalam_tindakan" | "selesai";
}) {
  const tindakanAction = markAduanDalamTindakan.bind(null, venueId) as (
    state: AduanActionState,
    formData: FormData,
  ) => Promise<AduanActionState>;
  const selesaiAction = markAduanSelesai.bind(null, venueId) as (
    state: AduanActionState,
    formData: FormData,
  ) => Promise<AduanActionState>;
  const [, tindakanFormAction] = useFormState(tindakanAction, aduanActionInitialState);
  const [, selesaiFormAction] = useFormState(selesaiAction, aduanActionInitialState);

  if (status === "selesai") return null;

  return (
    <div className="flex gap-2">
      {status === "dilaporkan" && (
        <form action={tindakanFormAction}>
          <input type="hidden" name="aduanId" value={aduanId} />
          <ActionButton label={ms.aset.aduan.tandaTindakan} />
        </form>
      )}
      <form action={selesaiFormAction}>
        <input type="hidden" name="aduanId" value={aduanId} />
        <ActionButton label={ms.aset.aduan.tandaSelesai} />
      </form>
    </div>
  );
}
