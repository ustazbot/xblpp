"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ms } from "@/constants/ms";
import { aduanKategoriValues, aduanKeterukanValues } from "@/lib/validators/aduan";
import { createAduan, aduanActionInitialState, type AduanActionState } from "./aduan-actions";

interface FacilityOption {
  id: string;
  nama: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "..." : ms.aset.aduan.hantar}
    </Button>
  );
}

export function AduanForm({ venueId, facilityList }: { venueId: string; facilityList: FacilityOption[] }) {
  const action = createAduan.bind(null, venueId) as (
    state: AduanActionState,
    formData: FormData,
  ) => Promise<AduanActionState>;
  const [state, formAction] = useFormState(action, aduanActionInitialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="facilityId">{ms.aset.aduan.labelFasiliti}</Label>
        <Select name="facilityId" defaultValue={facilityList[0]?.id}>
          <SelectTrigger id="facilityId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {facilityList.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kategori">{ms.aset.aduan.labelKategori}</Label>
        <Select name="kategori" defaultValue={aduanKategoriValues[0]}>
          <SelectTrigger id="kategori">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aduanKategoriValues.map((k) => (
              <SelectItem key={k} value={k}>
                {ms.aset.aduan.kategori[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="keterukan">{ms.aset.aduan.labelKeterukan}</Label>
        <Select name="keterukan" defaultValue={aduanKeterukanValues[2]}>
          <SelectTrigger id="keterukan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aduanKeterukanValues.map((k) => (
              <SelectItem key={k} value={k}>
                {ms.aset.aduan.keterukan[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="keterangan">{ms.aset.aduan.labelKeterangan}</Label>
        <textarea
          id="keterangan"
          name="keterangan"
          required
          rows={3}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
