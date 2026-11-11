"use client";
import { useActionState } from "react";
import { signIn } from "@/app/admin/login/actions";
import { initialFormState } from "@/lib/forms";
import { Notice } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialFormState);
  return (
    <form action={action} className="space-y-5">
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" defaultValue={String(state.values?.email ?? "")} className="field-input" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field-input" />
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
