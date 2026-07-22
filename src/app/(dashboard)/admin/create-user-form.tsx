"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ms } from "@/constants/ms";
import { createUser, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

interface Option {
  id: string;
  label: string;
}

interface RoleOption {
  code: string;
  label: string;
}

interface CreateUserFormProps {
  roleList: RoleOption[];
  negeriList: Option[];
  daerahList: Option[];
  venueList: Option[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "..." : ms.admin.pengguna.simpan}
    </Button>
  );
}

export function CreateUserForm({ roleList, negeriList, daerahList, venueList }: CreateUserFormProps) {
  const [state, formAction] = useFormState(createUser, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nama">{ms.admin.pengguna.labelNama}</Label>
          <Input id="nama" name="nama" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{ms.admin.pengguna.labelEmel}</Label>
          <Input id="email" name="email" type="email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefon">{ms.admin.pengguna.labelTelefon}</Label>
          <Input id="telefon" name="telefon" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jawatan">{ms.admin.pengguna.labelJawatan}</Label>
          <Input id="jawatan" name="jawatan" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="roleCode">{ms.admin.pengguna.labelRole}</Label>
          <Select name="roleCode" defaultValue={roleList[0]?.code}>
            <SelectTrigger id="roleCode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleList.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Negeri/daerah/premis dipaparkan sentiasa (bukan conditional JS) —
            hanya WAJIB ikut role dipilih (disahkan server, superRefine
            createUserSchema), sama pattern VenueForm negeri/daerah optional. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="negeriId">{ms.admin.pengguna.labelNegeri}</Label>
          <Select name="negeriId" defaultValue="">
            <SelectTrigger id="negeriId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{ms.admin.pengguna.tiadaBerkaitan}</SelectItem>
              {negeriList.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="daerahId">{ms.admin.pengguna.labelDaerah}</Label>
          <Select name="daerahId" defaultValue="">
            <SelectTrigger id="daerahId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{ms.admin.pengguna.tiadaBerkaitan}</SelectItem>
              {daerahList.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="venueId">{ms.admin.pengguna.labelPremis}</Label>
          <Select name="venueId" defaultValue="">
            <SelectTrigger id="venueId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{ms.admin.pengguna.tiadaBerkaitan}</SelectItem>
              {venueList.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
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
        <SubmitButton />
      </form>

      {state.tempPassword && (
        <div className="max-w-lg rounded-md border border-status-pending-border bg-card p-4">
          <p className="font-display font-bold text-lg">{ms.admin.pengguna.tempPasswordTajuk}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ms.admin.pengguna.tempPasswordAmaran}</p>
          <p className="mt-3 flex items-center justify-between rounded border bg-secondary px-3 py-2 font-mono text-sm">
            <span>
              {state.targetEmail} — <span className="font-semibold tracking-wide">{state.tempPassword}</span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
