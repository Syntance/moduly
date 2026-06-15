"use client";

import { useActionState } from "react";
import { Button, Input } from "@moduly/ui";
import { loginEmailAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

type Props = {
	googleEnabled: boolean;
	googleError?: boolean;
};

export function LoginForm({ googleEnabled, googleError }: Props) {
	const [state, formAction, pending] = useActionState(loginEmailAction, initialState);

	const errorMessage =
		state.error ?? (googleError ? "Logowanie Google nie powiodło się." : null);

	return (
		<div className="flex flex-col gap-6">
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

				{errorMessage ? (
					<p role="alert" aria-live="assertive" className="text-sm text-destructive">
						{errorMessage}
					</p>
				) : null}

				<Button type="submit" size="lg" disabled={pending} className="h-10 w-full">
					{pending ? "Logowanie…" : "Zaloguj się"}
				</Button>
			</form>

			{googleEnabled ? (
				<p className="text-center text-xs text-muted-foreground">
					Logowanie Google wymaga skonfigurowanego providera w backendzie Medusa.
				</p>
			) : null}
		</div>
	);
}
