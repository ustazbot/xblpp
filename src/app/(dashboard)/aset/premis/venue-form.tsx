"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ms } from "@/constants/ms";
import { venueTypeValues, venueStatusValues } from "@/lib/validators/aset";
import type { ActionState } from "./actions";

const initialState: ActionState = { error: null };

interface Option {
  id: string;
  label: string;
}

export interface VenueFormValues {
  nama: string;
  jenis: (typeof venueTypeValues)[number];
  alamat: string;
  negeriId: string;
  daerahId: string | null;
  googleMapsUrl: string | null;
  picUserId: string | null;
  status: (typeof venueStatusValues)[number];
}

interface VenueFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  negeriList: Option[];
  daerahList: Option[];
  picCandidates: Option[];
  defaultValues?: VenueFormValues;
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

export function VenueForm({
  action,
  negeriList,
  daerahList,
  picCandidates,
  defaultValues,
  submitLabel,
}: VenueFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nama">{ms.aset.labelNama}</Label>
        <Input id="nama" name="nama" required defaultValue={defaultValues?.nama} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jenis">{ms.aset.labelJenis}</Label>
        <Select name="jenis" defaultValue={defaultValues?.jenis ?? venueTypeValues[0]}>
          <SelectTrigger id="jenis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {venueTypeValues.map((v) => (
              <SelectItem key={v} value={v}>
                {ms.aset.jenisVenue[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alamat">{ms.aset.labelAlamat}</Label>
        <Input id="alamat" name="alamat" required defaultValue={defaultValues?.alamat} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="negeriId">{ms.aset.labelNegeri}</Label>
        <Select name="negeriId" defaultValue={defaultValues?.negeriId}>
          <SelectTrigger id="negeriId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {negeriList.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* WP Kuala Lumpur/Labuan/Putrajaya tiada daerah — nullable, boleh
            tinggalkan kosong. */}
        <Label htmlFor="daerahId">{ms.aset.labelDaerah}</Label>
        <Select name="daerahId" defaultValue={defaultValues?.daerahId ?? ""}>
          <SelectTrigger id="daerahId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{ms.aset.picTiadaDipilih}</SelectItem>
            {daerahList.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="googleMapsUrl">{ms.aset.labelGoogleMaps}</Label>
        <Input
          id="googleMapsUrl"
          name="googleMapsUrl"
          type="url"
          defaultValue={defaultValues?.googleMapsUrl ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="picUserId">{ms.aset.labelPic}</Label>
        <Select name="picUserId" defaultValue={defaultValues?.picUserId ?? ""}>
          <SelectTrigger id="picUserId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{ms.aset.picTiadaDipilih}</SelectItem>
            {picCandidates.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">{ms.aset.labelStatus}</Label>
        <Select name="status" defaultValue={defaultValues?.status ?? "aktif"}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {venueStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {ms.aset.statusVenue[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
