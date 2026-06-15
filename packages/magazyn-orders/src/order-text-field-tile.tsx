"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@moduly/ui";

type Props = {
	label: string;
	value: string;
};

export function OrderTextFieldTile({ label, value }: Props) {
	const [expanded, setExpanded] = useState(false);

	function toggle() {
		setExpanded((open) => !open);
	}

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			toggle();
		}
	}

	return (
		<div
			role="button"
			tabIndex={0}
			aria-expanded={expanded}
			onClick={toggle}
			onKeyDown={onKeyDown}
			className={cn(
				"overflow-hidden rounded-lg border border-border/80 bg-card text-left shadow-sm outline-none",
				"cursor-pointer transition-colors hover:bg-muted/20",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
			)}
		>
			<p className="truncate px-3 py-2.5 text-xs font-semibold tracking-wide text-foreground">{label}</p>

			<div className="relative border-t border-border/50">
				<div
					className={cn(
						"relative z-[1] px-3 transition-[max-height,padding] duration-300 ease-out motion-reduce:transition-none",
						expanded ? "max-h-[min(24rem,70vh)] overflow-y-auto py-3" : "max-h-[2.5rem] overflow-hidden py-2",
					)}
				>
					<p className="text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap">{value}</p>
				</div>

				{!expanded ? (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-background/45 to-background/90 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
					/>
				) : (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 rounded-b-lg border-t border-border/30 bg-muted/25 backdrop-blur-md motion-reduce:backdrop-blur-none"
					/>
				)}
			</div>

			{!expanded ? (
				<p className="px-3 pb-2 text-[10px] text-muted-foreground">Kliknij, aby rozwinąć treść</p>
			) : null}
		</div>
	);
}
