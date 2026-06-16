import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/* ─── Page header ──────────────────────────────────────────────── */
export function PageHeader({ title, description, action }: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 className="font-serif text-2xl text-foreground">{title}</h1>
				{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
			</div>
			{action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
		</header>
	);
}

/* ─── Card ─────────────────────────────────────────────────────── */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={cn("rounded-xl border border-border bg-card p-6", className)}>
			{children}
		</div>
	);
}

/* ─── Module tile ──────────────────────────────────────────────── */
export function ModuleTile({ href, label, icon, badge }: {
	href: string;
	label: string;
	icon: ReactNode;
	badge?: string;
}) {
	return (
		<a
			href={href}
			className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
				{icon}
			</span>
			<span className="flex-1 font-serif text-lg text-foreground">{label}</span>
			{badge ? (
				<span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
					{badge}
				</span>
			) : null}
		</a>
	);
}

/* ─── Badge ────────────────────────────────────────────────────── */
export const BADGE_TONE = {
	neutral: "bg-muted text-muted-foreground",
	info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
	warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
	danger: "bg-destructive/10 text-destructive",
	refund: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
	brand: "bg-primary/10 text-primary",
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

export function Badge({ children, tone = "neutral", className }: {
	children: ReactNode;
	tone?: BadgeTone;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
				BADGE_TONE[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
	return <Badge tone={tone}>{label}</Badge>;
}

/* ─── Table ────────────────────────────────────────────────────── */
export function Table({ children }: { children: ReactNode }) {
	return (
		<div className="overflow-x-auto rounded-xl border border-border">
			<table className="w-full border-collapse text-left">{children}</table>
		</div>
	);
}

export function THead({ children }: { children: ReactNode }) {
	return <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">{children}</thead>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
	return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
	return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
	return <td className={cn("px-4 py-3 text-sm", className)}>{children}</td>;
}

/* ─── KPI tile ─────────────────────────────────────────────────── */
export function StatTile({ label, value, sub, trend }: {
	label: string;
	value: ReactNode;
	sub?: string;
	trend?: { val: string; up: boolean };
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
			<p className="mt-2 font-serif text-2xl text-foreground">{value}</p>
			{(sub || trend) ? (
				<div className="mt-1 flex items-center gap-2">
					{sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
					{trend ? (
						<span className={cn("text-xs font-medium", trend.up ? "text-emerald-700" : "text-red-700")}>
							{trend.up ? "↑" : "↓"} {trend.val}
						</span>
					) : null}
				</div>
			) : null}
		</div>
	);
}

/* ─── Section ──────────────────────────────────────────────────── */
export function Section({ title, action, children }: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-serif text-lg text-foreground">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}
