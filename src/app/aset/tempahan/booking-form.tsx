"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ms } from "@/constants/ms";
import { bookingTypeValues } from "@/lib/validators/booking";
import type { ActionState } from "./actions";

const initialState: ActionState = { error: null };

interface FacilityOption {
  id: string;
  label: string;
}

interface BookingFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  facilityOptions: FacilityOption[];
  defaultFacilityId?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "..." : ms.tempahan.simpan}
    </Button>
  );
}

export function BookingForm({ action, facilityOptions, defaultFacilityId }: BookingFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  // Tempahan umum sahaja perlukan medan penyewa* — toggle client-side ikut
  // pilihan jenisTempahan (validation sebenar tetap server-side, Zod
  // superRefine, ini cuma UX supaya medan tak relevan disembunyikan).
  const [jenisTempahan, setJenisTempahan] = useState<(typeof bookingTypeValues)[number]>("dalaman_kemas");

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jenisTempahan">{ms.tempahan.labelJenisTempahan}</Label>
        <Select
          name="jenisTempahan"
          value={jenisTempahan}
          onValueChange={(v) => setJenisTempahan(v as (typeof bookingTypeValues)[number])}
        >
          <SelectTrigger id="jenisTempahan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bookingTypeValues.map((v) => (
              <SelectItem key={v} value={v}>
                {ms.tempahan.jenisTempahan[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="facilityId">{ms.tempahan.labelFasiliti}</Label>
        <Select name="facilityId" defaultValue={defaultFacilityId}>
          <SelectTrigger id="facilityId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {facilityOptions.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tujuan">{ms.tempahan.labelTujuan}</Label>
        <Textarea id="tujuan" name="tujuan" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="anggaranPeserta">{ms.tempahan.labelAnggaranPeserta}</Label>
        <Input id="anggaranPeserta" name="anggaranPeserta" type="number" min={1} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startTime">{ms.tempahan.labelMasaMula}</Label>
        <Input id="startTime" name="startTime" type="datetime-local" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="endTime">{ms.tempahan.labelMasaTamat}</Label>
        <Input id="endTime" name="endTime" type="datetime-local" required />
      </div>

      {jenisTempahan === "umum" && (
        <div className="flex flex-col gap-4 rounded-md border p-4">
          <p className="text-sm font-medium">{ms.tempahan.maklumatPenyewa}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="penyewaNama">{ms.tempahan.labelPenyewaNama}</Label>
            <Input id="penyewaNama" name="penyewaNama" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="penyewaOrganisasi">{ms.tempahan.labelPenyewaOrganisasi}</Label>
            <Input id="penyewaOrganisasi" name="penyewaOrganisasi" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="penyewaTelefon">{ms.tempahan.labelPenyewaTelefon}</Label>
            <Input id="penyewaTelefon" name="penyewaTelefon" type="tel" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="penyewaEmel">{ms.tempahan.labelPenyewaEmel}</Label>
            <Input id="penyewaEmel" name="penyewaEmel" type="email" />
          </div>
          <p className="text-xs text-muted-foreground">{ms.tempahan.notaKadarSewaan}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{ms.tempahan.amaranKelulusanNegeri}</p>
      <p className="text-xs text-muted-foreground">{ms.tempahan.amaranDwiKelulusan}</p>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
