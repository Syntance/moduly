"use client";

import { Loader2 } from "lucide-react";
import { useId } from "react";
import { Switch } from "@moduly/ui";
import { cn } from "@moduly/ui";
import {
	EMAIL_TEMPLATE_CATEGORIES,
	type EmailTemplate,
	type EmailTemplateType,
	getClientTemplateType,
	getEmailTemplatesByCategory,
	isEmailTemplateEnabled,
	resolveAudienceTemplateType,
} from "./template-types";

type Props = {
	activeType: EmailTemplateType;
	onSelect: (type: EmailTemplateType) => void;
	enabledByType: Record<EmailTemplateType, boolean>;
	onToggleEnabled: (type: EmailTemplateType, enabled: boolean) => void;
	togglingType?: EmailTemplateType | null;
};

function TemplateListRow({
	type,
	label,
	description,
	active,
	enabled,
	busy,
	onSelect,
	onToggleEnabled,
}: {
	type: EmailTemplateType;
	label: string;
	description: string;
	active: boolean;
	enabled: boolean;
	busy: boolean;
	onSelect: (type: EmailTemplateType) => void;
	onToggleEnabled: (type: EmailTemplateType, enabled: boolean) => void;
}) {
	const switchId = useId();

	return (
		<li
			className={cn(
				"flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
				active ? "border-primary/30 bg-primary/5" : "border-transparent hover:bg-muted/60",
				!enabled && !active && "opacity-70",
			)}
		>
			<button
				type="button"
				onClick={() => { onSelect(type); }}
				className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<span
					className={cn(
						"block text-sm font-medium",
						active ? "text-foreground" : "text-foreground/90",
					)}
				>
					{label}
				</span>
				<span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
			</button>
			<div className="flex shrink-0 items-center gap-2">
				{busy ? (
					<Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
				) : null}
				<Switch
					id={switchId}
					checked={enabled}
					disabled={busy}
					aria-label={`${enabled ? "Wyłącz" : "Włącz"} wysyłkę: ${label}`}
					onCheckedChange={(next) => { onToggleEnabled(type, next); }}
				/>
			</div>
		</li>
	);
}

export function EmailTemplatePicker({
	activeType,
	onSelect,
	enabledByType,
	onToggleEnabled,
	togglingType = null,
}: Props) {
	return (
		<div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
			{EMAIL_TEMPLATE_CATEGORIES.map((category) => (
				<section key={category.id} className="min-w-0 flex-1">
					<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{category.title}
					</h3>
					<ul className="flex flex-col gap-0.5">
						{getEmailTemplatesByCategory(category.id).map(({ type, label, description }) => {
							const isContactCategory = category.id === "contact";
							const resolvedType = isContactCategory
								? resolveAudienceTemplateType(type, activeType)
								: type;
							const isActive = isContactCategory
								? getClientTemplateType(activeType) === type
								: activeType === type;

							return (
								<TemplateListRow
									key={type}
									type={resolvedType}
									label={label}
									description={description}
									active={isActive}
									enabled={enabledByType[resolvedType] ?? true}
									busy={togglingType === resolvedType}
									onSelect={onSelect}
									onToggleEnabled={onToggleEnabled}
								/>
							);
						})}
					</ul>
				</section>
			))}
		</div>
	);
}

/** Mapa włączenia z listy szablonów w edytorze. */
export function enabledByTypeFromTemplates(
	templates: EmailTemplate[],
): Record<EmailTemplateType, boolean> {
	const out = {} as Record<EmailTemplateType, boolean>;
	for (const t of templates) {
		out[t.type] = isEmailTemplateEnabled(t);
	}
	return out;
}
