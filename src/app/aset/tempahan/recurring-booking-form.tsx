"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ms } from "@/constants/ms";
import { bookingTypeValues } from "@/lib/validators/booking";
import { recurringPatternValues, MAX_RECURRING_COUNT } from "@/lib/booking-rules";
import type { RecurringActionState } from "./actions";

const initialState: RecurringActionState = { error: null, summary: null };

interface FacilityOption {
  id: string;
  label: string;
}

interface RecurringBookingFormProps {
  action: (state: RecurringActionState, formData: FormData) => Promise<RecurringActionState>;
  facilityOptions: FacilityOption[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "..." : ms.tempahan.simpanBerulang}
    </Button>
  );
}

export function RecurringBookingForm({ action, facilityOptions }: RecurringBookingFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const [jenisTempahan, setJenisTempahan] = useState<(typeof bookingTypeValues)[number]>("dalaman_kemas");

  if (state.summary) {
    const { total, created, gagal } = state.summary;
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <h2 className="text-lg font-semibold">{ms.tempahan.ringkasanBerulang}</h2>
        <p className="text-sm">{ms.tempahan.ringkasanBerjaya(created, total)}</p>
        {gagal.length > 0 && (
          <div className="rounded-md border border-destructive/50 p-3">
            <p className="text-sm font-medium text-destructive">{ms.tempahan.ringkasanGagalTajuk}</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {gagal.map((g, i) => (
                <li key={i}>
                  {g.tarikh} — {g.sebab}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/aset/tempahan">{ms.tempahan.lihatSenarai}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/aset/tempahan/berulang">{ms.tempahan.tempahLagiSatu}</Link>
          </Button>
        </div>
      </div>
    );
  }

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
        <Select name="facilityId">
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

      <p className="text-xs text-muted-foreground">{ms.tempahan.notaKejadianPertama}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurringPattern">{ms.tempahan.labelCorakUlangan}</Label>
        <Select name="recurringPattern" defaultValue="mingguan">
          <SelectTrigger id="recurringPattern">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {recurringPatternValues.map((v) => (
              <SelectItem key={v} value={v}>
                {ms.tempahan.corakUlangan[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurringCount">{ms.tempahan.labelBilanganUlangan}</Label>
        <Input
          id="recurringCount"
          name="recurringCount"
          type="number"
          min={2}
          max={MAX_RECURRING_COUNT}
          defaultValue={4}
          required
        />
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
