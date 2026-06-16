"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAnalytics } from "@moduly/analytics";
import { Button, Input } from "@moduly/ui";
import {
	type ContactTopicPreset,
	formatContactTopicLabel,
	getContactTopicOptions,
} from "../lib/validation/contact";
import { submitContact, type ContactState } from "../submit-contact";

const INITIAL: ContactState = { status: "idle" };

type TopicOption = { value: string; label: string };

export type ContactFormProps = {
	variant?: "page" | "embedded";
	topicPreset?: ContactTopicPreset;
	topicOptions?: TopicOption[];
	privacyPolicyHref?: string;
	footerAside?: ReactNode;
	onSubmitted?: (payload: { topic: string; topicOther?: string }) => void;
};

export function ContactForm({
	variant = "page",
	topicPreset = "kontakt",
	topicOptions: topicOptionsProp,
	privacyPolicyHref = "/polityka-prywatnosci",
	footerAside,
	onSubmitted,
}: ContactFormProps) {
	const analytics = useAnalytics();
	const formName = `contact_${topicPreset}`;
	const topicOptions = topicOptionsProp ?? getContactTopicOptions(topicPreset);
	const embedded = variant === "embedded";
	const [state, formAction, isPending] = useActionState(submitContact, INITIAL);
	const [topic, setTopic] = useState("");
	const lastSubmittedRef = useRef<string | null>(null);
	const formStartedRef = useRef(false);
	const topicId = useId();

	useEffect(() => {
		if (state.status !== "success") return;
		const key = `${state.topic}:${state.topicOther ?? ""}`;
		if (lastSubmittedRef.current === key) return;
		lastSubmittedRef.current = key;
		analytics.formSubmit({ form_name: formName });
		analytics.lead({ source: formName });
		onSubmitted?.({ topic: state.topic, topicOther: state.topicOther });
	}, [analytics, formName, onSubmitted, state]);

	useEffect(() => {
		if (state.status !== "error" || !state.errors) return;
		for (const field of Object.keys(state.errors)) {
			analytics.formFieldError({ form_name: formName, field });
		}
	}, [analytics, formName, state]);

	const handleFormFocus = () => {
		if (formStartedRef.current) return;
		formStartedRef.current = true;
		analytics.formStart({ form_name: formName });
	};

	if (state.status === "success") {
		return (
			<div className="rounded-3xl border border-border bg-card p-8 text-center md:p-12">
				<p className="font-serif text-2xl font-semibold leading-tight text-foreground md:text-3xl">
					Dziękujemy — wiadomość przyjęta.
				</p>
				<p className="mt-3 max-w-xl text-pretty text-muted-foreground md:mx-auto">
					Odpowiadamy w 12 godzin roboczych. Temat:{" "}
					<strong className="text-foreground">
						{formatContactTopicLabel({
							topic: state.topic,
							topicOther: state.topicOther,
						})}
					</strong>
					.
				</p>
				<p className="mt-4 font-mono text-sm tabular-nums text-muted-foreground">
					Numer sprawy:{" "}
					<strong className="text-foreground">{state.caseNumber}</strong>
				</p>
			</div>
		);
	}

	const errors = state.status === "error" ? state.errors : {};
	const formError = state.status === "error" ? state.message : undefined;

	return (
		<form
			action={formAction}
			className="rounded-3xl border border-border bg-card p-6 md:p-8"
			noValidate
			onFocusCapture={handleFormFocus}
		>
			<input type="hidden" name="formPreset" value={topicPreset} />
			{embedded ? (
				<p className="text-center font-serif text-2xl font-semibold leading-tight text-foreground">
					Formularz kontaktowy
				</p>
			) : (
				<>
					<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Formularz kontaktowy
					</p>
					<h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-foreground">
						Napisz do nas
					</h2>
				</>
			)}

			{formError ? (
				<p role="alert" className="mt-4 text-sm text-destructive">
					{formError}
				</p>
			) : null}

			<div className="mt-6 grid gap-4 md:grid-cols-2">
				<label className="flex flex-col gap-1.5 text-sm">
					<span>Imię</span>
					<Input name="name" autoComplete="name" required aria-invalid={!!errors.name} />
					{errors.name ? <span className="text-destructive">{errors.name}</span> : null}
				</label>
				<label className="flex flex-col gap-1.5 text-sm">
					<span>E-mail</span>
					<Input
						name="email"
						type="email"
						autoComplete="email"
						required
						aria-invalid={!!errors.email}
					/>
					{errors.email ? <span className="text-destructive">{errors.email}</span> : null}
				</label>
			</div>

			<label className="mt-4 flex flex-col gap-1.5 text-sm">
				<span>Temat</span>
				<select
					id={topicId}
					name="topic"
					value={topic}
					onChange={(e) => { setTopic(e.target.value); }}
					className="h-10 rounded-md border border-input bg-background px-3 text-sm"
					required
					aria-invalid={!!errors.topic}
				>
					<option value="">Wybierz temat…</option>
					{topicOptions.map((opt: TopicOption) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				{errors.topic ? <span className="text-destructive">{errors.topic}</span> : null}
			</label>

			{topic === "inne" ? (
				<label className="mt-4 flex flex-col gap-1.5 text-sm">
					<span>Inny temat</span>
					<Input name="topicOther" maxLength={80} aria-invalid={!!errors.topicOther} />
					{errors.topicOther ? (
						<span className="text-destructive">{errors.topicOther}</span>
					) : null}
				</label>
			) : null}

			<label className="mt-4 flex flex-col gap-1.5 text-sm">
				<span>Wiadomość</span>
				<textarea
					name="message"
					rows={6}
					className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					required
					aria-invalid={!!errors.message}
				/>
				{errors.message ? (
					<span className="text-destructive">{errors.message}</span>
				) : null}
			</label>

			<p className="mt-4 text-xs text-muted-foreground">
				Wysyłając formularz akceptujesz{" "}
				<Link href={privacyPolicyHref} className="text-primary underline underline-offset-4">
					politykę prywatności
				</Link>
				.
			</p>

			<div className="mt-6 flex flex-wrap items-center gap-4">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Wysyłam…" : "Wyślij wiadomość"}
				</Button>
				{footerAside}
			</div>
		</form>
	);
}
