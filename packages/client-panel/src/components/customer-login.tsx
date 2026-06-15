"use client";

import { useState } from "react";
import { Button, Input } from "@moduly/ui";
import { notifyCustomerSessionChanged } from "../lib/session-storage";

type Step = "email" | "code";

export function CustomerLogin() {
	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function requestCode() {
		setPending(true);
		setError(null);
		try {
			const res = await fetch("/api/customer/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok || !data.ok) {
				setError(data.error ?? "Nie udało się wysłać kodu.");
				return;
			}
			setStep("code");
		} catch {
			setError("Nie udało się połączyć z serwerem.");
		} finally {
			setPending(false);
		}
	}

	async function verifyCode() {
		setPending(true);
		setError(null);
		try {
			const res = await fetch("/api/customer/verify-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, code }),
				credentials: "include",
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok || !data.ok) {
				setError(data.error ?? "Niepoprawny kod.");
				return;
			}
			notifyCustomerSessionChanged();
			window.location.reload();
		} catch {
			setError("Nie udało się połączyć z serwerem.");
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-6">
			<h1 className="font-serif text-2xl text-foreground">Moje konto</h1>
			<p className="text-sm text-muted-foreground">
				Zaloguj się kodem wysłanym na e-mail z zamówienia.
			</p>

			{step === "email" ? (
				<>
					<label className="flex flex-col gap-1 text-sm">
						<span>E-mail</span>
						<Input
							type="email"
							value={email}
							onChange={(e) => { setEmail(e.target.value); }}
							autoComplete="email"
						/>
					</label>
					<Button type="button" onClick={requestCode} disabled={pending || !email}>
						{pending ? "Wysyłam…" : "Wyślij kod"}
					</Button>
				</>
			) : (
				<>
					<label className="flex flex-col gap-1 text-sm">
						<span>Kod z e-maila</span>
						<Input
							inputMode="numeric"
							maxLength={6}
							value={code}
							onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
						/>
					</label>
					<Button type="button" onClick={verifyCode} disabled={pending || code.length !== 6}>
						{pending ? "Sprawdzam…" : "Zaloguj"}
					</Button>
				</>
			)}

			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
