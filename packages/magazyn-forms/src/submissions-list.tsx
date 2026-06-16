import { MessageSquare } from "lucide-react";
import { Badge } from "@moduly/ui";
import type { ContactSubmissionListItem } from "@moduly/types";

type Props = {
	submissions: ContactSubmissionListItem[];
};

export function SubmissionsList({ submissions }: Props) {
	if (submissions.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">Brak otrzymanych zgłoszeń.</p>
		);
	}

	return (
		<ul className="flex flex-col gap-2">
			{submissions.map((s) => (
				<li key={s.id}>
					<div className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left">
						<span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
							<MessageSquare className="size-4" aria-hidden />
						</span>
						<div className="min-w-0 flex-1">
							<div className="mb-1 flex flex-wrap items-center gap-2">
								<span className="text-sm font-semibold text-foreground">{s.topicLabel}</span>
								<Badge tone="info">{s.formName}</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								<span className="font-medium text-foreground">{s.customerName}</span>
								{" · "}
								{s.customerEmail}
							</p>
							<p className="mt-1 font-mono text-xs text-muted-foreground">{s.caseNumber}</p>
						</div>
						<span className="shrink-0 text-xs text-muted-foreground">
							{new Date(s.createdAt).toLocaleString("pl-PL")}
						</span>
					</div>
				</li>
			))}
		</ul>
	);
}
