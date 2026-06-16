"use client";

import Link from "next/link";
import { Edit3, Eye, Mail } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatTile } from "@moduly/ui";
import type { EmailTemplate } from "./template-types";
import { EMAIL_TEMPLATE_TYPES } from "./template-types";

type Props = {
	templates: EmailTemplate[];
	basePath: string;
};

export function EmailsList({ templates, basePath }: Props) {
	const byType = new Map(templates.map((t) => [t.type, t]));
	const enabledCount = templates.filter((t) => t.enabled).length;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="E-maile"
				description="Szablony wiadomości transakcyjnych wysyłanych do klientów."
				action={
					<Button type="button">
						<Mail className="size-4" aria-hidden />
						Nowy szablon
					</Button>
				}
			/>

			<div className="grid gap-4 sm:grid-cols-3">
				<StatTile label="Aktywne szablony" value={enabledCount} />
				<StatTile label="Łącznie" value={templates.length} />
				<StatTile label="Kategorie" value="Zamówienie · Formularze" />
			</div>

			<ul className="flex flex-col gap-3">
				{EMAIL_TEMPLATE_TYPES.map(({ type, label, description }) => {
					const template = byType.get(type);
					const enabled = template?.enabled ?? false;
					return (
						<li key={type}>
							<Card className="!p-5">
								<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
									<div className="flex flex-1 items-center gap-4">
										<div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
											<Mail className="size-4" aria-hidden />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-sm font-semibold text-foreground">{label}</p>
												<Badge tone={enabled ? "success" : "warning"}>
													{enabled ? "Aktywny" : "Wyłączony"}
												</Badge>
											</div>
											<p className="mt-0.5 font-mono text-xs text-muted-foreground">{type}</p>
											<p className="mt-1 text-xs text-muted-foreground">{description}</p>
										</div>
									</div>

									<div className="flex gap-2">
										<Button type="button" variant="outline" size="sm">
											<Eye className="size-3.5" aria-hidden />
											Podgląd
										</Button>
										<Link
											href={`${basePath}/panel/maile/${type}`}
											className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
										>
											<Edit3 className="size-3.5" aria-hidden />
											Edytuj
										</Link>
									</div>
								</div>
							</Card>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
