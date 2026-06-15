import Link from "next/link";
import { ArrowRight, Banknote, CircleDollarSign, ShoppingBag, Wallet } from "lucide-react";
import { formatPrice } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { AdminOrdersOverviewSummary } from "./order-types";

function orderCountLabel(count: number): string {
	if (count === 1) return "1 zamówienie";
	if (count >= 2 && count <= 4) return `${count} zamówienia`;
	return `${count} zamówień`;
}

function SummaryCard({
	label,
	value,
	hint,
	icon: Icon,
}: {
	label: string;
	value: string;
	hint?: string;
	icon: typeof ShoppingBag;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-sm text-muted-foreground">{label}</p>
					<p className="mt-1 font-serif text-2xl tabular-nums text-foreground">{value}</p>
					{hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
				</div>
				<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
					<Icon className="size-5" aria-hidden />
				</span>
			</div>
		</div>
	);
}

export function OverviewOrdersSummary({ summary }: { summary: AdminOrdersOverviewSummary }) {
	const ordersHref = `${getModulyConfig().basePath}/panel/zamowienia`;
	const currency = summary.currencyCode;

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="font-serif text-lg text-foreground">Zamówienia</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Aktywne zamówienia ze sklepu (bez archiwizowanych i anulowanych).
					</p>
				</div>
				<Link
					href={ordersHref}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
				>
					Zobacz listę
					<ArrowRight className="size-4" aria-hidden />
				</Link>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					label="Liczba zamówień"
					value={String(summary.orderCount)}
					hint={orderCountLabel(summary.orderCount)}
					icon={ShoppingBag}
				/>
				<SummaryCard
					label="Wartość łączna"
					value={formatPrice(summary.totalMinor, { currency })}
					hint="Suma wartości aktywnych zamówień"
					icon={CircleDollarSign}
				/>
				<SummaryCard
					label="Opłacone"
					value={formatPrice(summary.paidTotalMinor, { currency })}
					hint={orderCountLabel(summary.paidCount)}
					icon={Banknote}
				/>
				<SummaryCard
					label="Oczekuje płatności"
					value={formatPrice(summary.unpaidTotalMinor, { currency })}
					hint={orderCountLabel(summary.unpaidCount)}
					icon={Wallet}
				/>
			</div>

		</section>
	);
}
