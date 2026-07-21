"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ms } from "@/constants/ms";
import type { ActionState } from "../actions";

const initialState: ActionState = { error: null };

function SubmitButton({ label, variant }: { label: string; variant?: "default" | "destructive" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending ? "..." : label}
    </Button>
  );
}

export function ApproveForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <SubmitButton label={ms.tempahan.lulus} />
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function RejectForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="rejectionReason">{ms.tempahan.labelSebabTolak}</Label>
      <Textarea id="rejectionReason" name="rejectionReason" required />
      <SubmitButton label={ms.tempahan.hantarPenolakan} variant="destructive" />
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
