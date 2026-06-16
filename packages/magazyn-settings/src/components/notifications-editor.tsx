"use client";

import { useState, useTransition } from "react";
import type { PanelNotificationSettings } from "@moduly/types";
import { Button, Input } from "@moduly/ui";
import { saveNotificationSettingsAction, type SaveNotificationsState } from "../actions";

type Props = {
	initial: Required<PanelNotificationSettings>;
	canEdit: boolean;
};

const FIELDS: Array<{ key: keyof PanelNotificationSettings; label: string }> = [
	{ key: "orderEmail", label: "Nowe zamówienie" },
	{ key: "lowStockEmail", label: "Niski stan magazynu" },
	{ key: "formEmail", label: "Formularze kontaktowe" },
	{ key: "returnsEmail", label: "Zwroty / reklamacje" },
];

export function NotificationsEditor({ initial, canEdit }: Props) {
	const [values, setValues] = useState(initial);
	const [state, setState] = useState<SaveNotificationsState>({ ok: false, error: null });
	const [pending, startTransition] = useTransition();

	if (!canEdit) {
		return (
			<p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
				Edycja powiadomień wymaga backendu Medusa. W trybie CMS ustaw adresy w{" "}
				<code className="text-foreground">moduly.config.ts</code> →{" "}
				<code className="text-foreground">email.contactEmail</code>.
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
			onSubmit={(e) => {
				e.preventDefault();
				startTransition(async () => {
					const result = await saveNotificationSettingsAction(values);
					setState(result);
				});
			}}
		>
			<div>
				<h3 className="font-serif text-base text-foreground">Edytuj adresy</h3>
				<p className="text-xs text-muted-foreground">
					Zapis w metadata sklepu Medusa — nadpisuje domyślny contactEmail z configu.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				{FIELDS.map(({ key, label }) => (
					<label key={key} className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-muted-foreground">{label}</span>
						<Input
							type="email"
							value={values[key]}
							onChange={(e) => {
								setValues((prev) => ({ ...prev, [key]: e.target.value }));
							}}
							autoComplete="email"
						/>
					</label>
				))}
			</div>

			{state.error ? (
				<p className="text-sm text-destructive" role="alert">
					{state.error}
				</p>
			) : null}
			{state.ok ? (
				<p className="text-sm text-green-700 dark:text-green-400" role="status">
					Zapisano powiadomienia.
				</p>
			) : null}

			<div>
				<Button type="submit" disabled={pending}>
					{pending ? "Zapisywanie…" : "Zapisz powiadomienia"}
				</Button>
			</div>
		</form>
	);
}
