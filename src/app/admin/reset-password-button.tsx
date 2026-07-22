"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ms } from "@/constants/ms";
import { resetUserPassword, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "..." : ms.admin.pengguna.resetPassword}
    </Button>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, formAction] = useFormState(resetUserPassword, initialState);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(ms.admin.pengguna.resetPasswordKonfirmasi)) e.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton />
      </form>
      {state.error && (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.tempPassword && (
        <div className="rounded-md border border-status-pending-border bg-card p-2 text-xs">
          <p className="font-medium">{ms.admin.pengguna.tempPasswordTajuk}</p>
          <p className="mt-1 font-mono">{state.tempPassword}</p>
        </div>
      )}
    </div>
  );
}
