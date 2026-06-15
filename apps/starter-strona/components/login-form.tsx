"use client";

import { Button, Input } from "@moduly/ui";
import { useActionState } from "react";
import { loginEmailAction, type LoginState } from "@/lib/auth-actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginEmailAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@twojadomena.pl"
          className="h-10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Hasło
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="h-10"
        />
      </div>

      {state.error ? (
        <p role="alert" aria-live="assertive" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="h-10 w-full">
        {pending ? "Logowanie…" : "Zaloguj się"}
      </Button>
    </form>
  );
}
