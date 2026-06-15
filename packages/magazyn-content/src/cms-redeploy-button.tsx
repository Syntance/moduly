"use client";

import { Loader2, Rocket } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@moduly/ui";
import { triggerCmsRedeployAction } from "./content-actions";

export function CmsRedeployButton() {
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function onRedeploy() {
		setMessage(null);
		setError(null);
		startTransition(async () => {
			const result = await triggerCmsRedeployAction();
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessage("Redeploy uruchomiony. Obrazy będą lokalne na produkcji za ok. 2–3 min.");
		});
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-xs leading-relaxed text-muted-foreground">
				<strong className="font-medium text-foreground">Zapis</strong> publikuje tekst od razu (bez
				redeploy).{" "}
				<strong className="font-medium text-foreground">Redeploy</strong> synchronizuje zdjęcia z CMS
				do buildu (PageSpeed).
			</p>
			<div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
				<Button
					type="button"
					variant="destructive"
					size="sm"
					disabled={pending}
					onClick={onRedeploy}
					className="gap-1.5 border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
				>
					{pending ? (
						<Loader2 className="size-4 animate-spin" aria-hidden />
					) : (
						<Rocket className="size-4" aria-hidden />
					)}
					Redeploy
				</Button>
				{message ? (
					<p role="status" className="text-xs text-emerald-600">
						{message}
					</p>
				) : null}
				{error ? (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				) : null}
			</div>
		</div>
	);
}
