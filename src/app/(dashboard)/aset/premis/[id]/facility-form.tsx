"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ms } from "@/constants/ms";
import { facilityTypeValues, facilityStatusValues } from "@/lib/validators/aset";
import type { ActionState } from "../actions";

const initialState: ActionState = { error: null };

export interface FacilityFormValues {
  nama: string;
  jenis: (typeof facilityTypeValues)[number];
  kapasiti: number;
  status: (typeof facilityStatusValues)[number];
  maintenanceUntil?: string | null;
}

interface FacilityFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: FacilityFormValues;
  submitLabel: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "..." : label}
    </Button>
  );
}

export function FacilityForm({ action, defaultValues, submitLabel }: FacilityFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nama">{ms.aset.labelNama}</Label>
        <Input id="nama" name="nama" required defaultValue={defaultValues?.nama} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jenis">{ms.aset.labelJenis}</Label>
        <Select name="jenis" defaultValue={defaultValues?.jenis ?? facilityTypeValues[0]}>
          <SelectTrigger id="jenis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {facilityTypeValues.map((v) => (
              <SelectItem key={v} value={v}>
                {ms.aset.jenisFasiliti[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kapasiti">{ms.aset.labelKapasiti}</Label>
        <Input
          id="kapasiti"
          name="kapasiti"
          type="number"
          min={1}
          required
          defaultValue={defaultValues?.kapasiti}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">{ms.aset.labelStatus}</Label>
        <Select name="status" defaultValue={defaultValues?.status ?? "aktif"}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {facilityStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {ms.aset.statusFasiliti[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maintenanceUntil">{ms.aset.labelMaintenanceUntil}</Label>
        <Input
          id="maintenanceUntil"
          name="maintenanceUntil"
          type="date"
          defaultValue={defaultValues?.maintenanceUntil ?? ""}
        />
        <p className="text-xs text-muted-foreground">{ms.aset.notaMaintenanceUntil}</p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
