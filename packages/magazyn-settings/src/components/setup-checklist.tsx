import { Badge, Card } from "@moduly/ui";
import type { SetupCheckItem } from "../types";

const STATUS_TONE = {
	ok: "success",
	warning: "warning",
	missing: "danger",
	info: "neutral",
} as const;

type Props = {
	items: SetupCheckItem[];
};

export function SetupChecklist({ items }: Props) {
	const ready = items.filter((i) => i.status === "ok").length;

	return (
		<Card>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="font-serif text-lg text-foreground">Checklist wdrożenia</h2>
					<p className="text-xs text-muted-foreground">
						{ready}/{items.length} gotowe · podłącz klucze ENV i uruchom backend Medusa
					</p>
				</div>
				<Badge tone={ready === items.length ? "success" : "warning"}>
					{ready === items.length ? "Gotowe do startu" : "Wymaga konfiguracji"}
				</Badge>
			</div>
			<ul className="grid gap-2">
				{items.map((item) => (
					<li
						key={item.id}
						className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
					>
						<span className="text-sm font-medium text-foreground">{item.label}</span>
						<div className="flex flex-wrap items-center gap-2">
							<Badge tone={STATUS_TONE[item.status]}>
								{item.status === "ok"
									? "OK"
									: item.status === "warning"
										? "Uwaga"
										: item.status === "missing"
											? "Brak"
											: "Info"}
							</Badge>
							<span className="text-xs text-muted-foreground">{item.detail}</span>
						</div>
					</li>
				))}
			</ul>
		</Card>
	);
}
