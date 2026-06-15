"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@moduly/ui";
import { cn } from "@moduly/ui";
import { formatPrice } from "@moduly/magazyn-core/client";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { AdminOrderRow } from "./order-types";
import { BADGE_TONE_CLASS, fulfillmentStatusBadge, orderStatusBadge, paymentStatusBadge } from "./order-status";
import { OrderTableRow } from "./order-table-row";

const DATE_TIME = new Intl.DateTimeFormat(getModulyConfig().commerce.locale, {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

type SortColumn = "displayId" | "customer" | "itemCount" | "total" | "payment" | "fulfillment" | "status" | "createdAt";

type SortDirection = "asc" | "desc";

type SortState = { column: SortColumn; direction: SortDirection };

const DEFAULT_SORT: SortState = { column: "createdAt", direction: "desc" };

type ColumnDef = { id: SortColumn; label: string; className?: string };

const COLUMNS: ColumnDef[] = [
	{ id: "displayId", label: "Zamówienie" },
	{ id: "customer", label: "Klient" },
	{ id: "itemCount", label: "Pozycje", className: "hidden sm:table-cell" },
	{ id: "total", label: "Wartość" },
	{ id: "payment", label: "Płatność", className: "hidden md:table-cell" },
	{ id: "fulfillment", label: "Wysyłka", className: "hidden lg:table-cell" },
	{ id: "status", label: "Status" },
];

const STATUS_OPTIONS = [
	{ value: "all", label: "Wszystkie statusy" },
	{ value: "pending", label: "W toku" },
	{ value: "completed", label: "Zrealizowane" },
	{ value: "requires_action", label: "Wymaga działania" },
] as const;

const PAYMENT_OPTIONS = [
	{ value: "all", label: "Wszystkie płatności" },
	{ value: "captured", label: "Opłacone" },
	{ value: "not_paid", label: "Nieopłacone" },
	{ value: "awaiting", label: "Oczekuje" },
	{ value: "authorized", label: "Autoryzowane" },
	{ value: "canceled", label: "Anulowane" },
] as const;

const FULFILLMENT_OPTIONS = [
	{ value: "all", label: "Wszystkie wysyłki" },
	{ value: "not_fulfilled", label: "Oczekuje na akceptację" },
	{ value: "fulfilled", label: "W toku" },
	{ value: "shipped", label: "U kuriera" },
	{ value: "delivered", label: "Dostarczone" },
	{ value: "canceled", label: "Anulowane" },
] as const;

function StatusBadge({ label, tone }: { label: string; tone: keyof typeof BADGE_TONE_CLASS }) {
	return (
		<span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", BADGE_TONE_CLASS[tone])}>
			{label}
		</span>
	);
}

function compareOrders(a: AdminOrderRow, b: AdminOrderRow, sort: SortState): number {
	const dir = sort.direction === "asc" ? 1 : -1;

	switch (sort.column) {
		case "displayId":
			return (a.displayId - b.displayId) * dir;
		case "createdAt":
			return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
		case "customer": {
			const aName = (a.customerName || a.email).toLocaleLowerCase("pl");
			const bName = (b.customerName || b.email).toLocaleLowerCase("pl");
			return aName.localeCompare(bName, "pl") * dir;
		}
		case "itemCount":
			return (a.itemCount - b.itemCount) * dir;
		case "total":
			return (a.total - b.total) * dir;
		case "payment":
			return a.paymentStatus.localeCompare(b.paymentStatus, "pl") * dir;
		case "fulfillment":
			return a.fulfillmentStatus.localeCompare(b.fulfillmentStatus, "pl") * dir;
		case "status":
			return a.status.localeCompare(b.status, "pl") * dir;
		default:
			return 0;
	}
}

function matchesSearch(order: AdminOrderRow, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return [String(order.displayId), order.email, order.customerName, order.id].join(" ").toLowerCase().includes(q);
}

export function OrdersList({ orders }: { orders: AdminOrderRow[] }) {
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [paymentFilter, setPaymentFilter] = useState<string>("all");
	const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
	const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

	const hasFilters =
		query.trim().length > 0 || statusFilter !== "all" || paymentFilter !== "all" || fulfillmentFilter !== "all";

	const filtered = useMemo(() => {
		const result = orders.filter((order) => {
			if (!matchesSearch(order, query)) return false;
			if (statusFilter !== "all" && order.status !== statusFilter) return false;
			if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) return false;
			if (fulfillmentFilter !== "all" && order.fulfillmentStatus !== fulfillmentFilter) return false;
			return true;
		});
		return [...result].sort((a, b) => compareOrders(a, b, sort));
	}, [orders, query, statusFilter, paymentFilter, fulfillmentFilter, sort]);

	function toggleSort(column: SortColumn) {
		setSort((current) =>
			current.column === column
				? { column, direction: current.direction === "asc" ? "desc" : "asc" }
				: { column, direction: column === "createdAt" || column === "displayId" ? "desc" : "asc" },
		);
	}

	function clearFilters() {
		setQuery("");
		setStatusFilter("all");
		setPaymentFilter("all");
		setFulfillmentFilter("all");
		setSort(DEFAULT_SORT);
	}

	const selectClass =
		"h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
				<span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
					<Inbox className="size-6" aria-hidden />
				</span>
				<p className="text-sm text-muted-foreground">
					Brak zamówień. Gdy klient sfinalizuje zakup w sklepie, zamówienie wyląduje tutaj.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="relative max-w-md flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
					<Input
						type="search"
						value={query}
						onChange={(e) => { setQuery(e.target.value); }}
						placeholder="Szukaj: nr, klient, e-mail…"
						className="pl-9"
						aria-label="Szukaj zamówień"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }} className={selectClass} aria-label="Filtr statusu">
						{STATUS_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
					<select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); }} className={selectClass} aria-label="Filtr płatności">
						{PAYMENT_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
					<select value={fulfillmentFilter} onChange={(e) => { setFulfillmentFilter(e.target.value); }} className={selectClass} aria-label="Filtr wysyłki">
						{FULFILLMENT_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
					{hasFilters ? (
						<button
							type="button"
							onClick={clearFilters}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<X className="size-3.5" aria-hidden />
							Wyczyść
						</button>
					) : null}
				</div>
			</div>

			<p className="text-sm text-muted-foreground">
				{filtered.length === orders.length
					? `${orders.length} ${orders.length === 1 ? "zamówienie" : "zamówień"}`
					: `Pokazano ${filtered.length} z ${orders.length} zamówień`}
			</p>

			{filtered.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
					Brak wyników dla wybranych kryteriów.
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-border">
					<table className="w-full border-collapse text-left">
						<thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
							<tr>
								{COLUMNS.map((col) => {
									const active = sort.column === col.id;
									const SortIcon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
									return (
										<th key={col.id} className={cn("px-4 py-3 font-medium", col.className)}>
											<button
												type="button"
												onClick={() => { toggleSort(col.id); }}
												className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
												aria-label={`Sortuj: ${col.label}`}
												aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
											>
												{col.label}
												<SortIcon className={cn("size-3.5", active ? "text-foreground" : "opacity-40")} aria-hidden />
											</button>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filtered.map((order) => {
								const payment = paymentStatusBadge(order.paymentStatus, order.status);
								const fulfillment = fulfillmentStatusBadge(order.fulfillmentStatus, order.status);
								const status = orderStatusBadge(order.status);

								return (
									<OrderTableRow
										key={order.id}
										orderId={order.id}
										label={`Zamówienie #${order.displayId || "—"}, ${order.customerName || order.email}`}
									>
										<td className="px-4 py-3">
											<span className="block text-sm font-semibold text-foreground">#{order.displayId || "—"}</span>
											{order.expressDelivery ? (
												<span className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100">
													Express
												</span>
											) : null}
											<span className="block text-xs text-muted-foreground">
												{order.createdAt ? DATE_TIME.format(new Date(order.createdAt)) : "—"}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="block truncate text-sm font-medium text-foreground">{order.customerName || "Gość"}</span>
											<span className="block truncate text-xs text-muted-foreground">{order.email}</span>
										</td>
										<td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">{order.itemCount} szt.</td>
										<td className="px-4 py-3 text-sm font-medium text-foreground">{formatPrice(order.total, { currency: order.currencyCode })}</td>
										<td className="hidden px-4 py-3 md:table-cell">
											<StatusBadge label={payment.label} tone={payment.tone} />
										</td>
										<td className="hidden px-4 py-3 lg:table-cell">
											<StatusBadge label={fulfillment.label} tone={fulfillment.tone} />
										</td>
										<td className="px-4 py-3">
											<StatusBadge label={status.label} tone={status.tone} />
										</td>
									</OrderTableRow>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
