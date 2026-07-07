import Link from "next/link";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { formatPrice } from "@moduly/magazyn-core/lib/format";
import { cn } from "@moduly/ui";
import type { AdminOrderRow } from "@moduly/magazyn-orders";
import { BADGE_TONE_CLASS, orderStatusBadge } from "@moduly/magazyn-orders";

const DATE_FMT = new Intl.DateTimeFormat(getModulyConfig().commerce.locale, {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

export function OverviewRecentOrders({ orders }: { orders: AdminOrderRow[] }) {
	const base = `${getModulyConfig().basePath}/panel/zamowienia`;

	if (orders.length === 0) {
		return (
			<p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
				Brak zamĂłwieĹ„ do wyĹ›wietlenia.
			</p>
		);
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<h2 className="font-serif text-lg text-foreground">Ostatnie zamĂłwienia</h2>
				<Link
					href={base}
					className="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					Zobacz wszystkie â†’
				</Link>
			</div>

			<div className="overflow-x-auto rounded-xl border border-border">
				<table className="w-full border-collapse text-left">
					<thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
						<tr>
							{["ZamĂłwienie", "Klient", "WartoĹ›Ä‡", "Status"].map((heading) => (
								<th key={heading} className="px-4 py-3 font-medium">
									{heading}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{orders.map((order) => {
							const status = orderStatusBadge(order.status);
							return (
								<tr key={order.id} className="transition-colors hover:bg-muted/30">
									<td className="px-4 py-3">
										<Link
											href={`${base}/${order.id}`}
											className="block text-sm font-semibold text-foreground hover:text-primary"
										>
											#{order.displayId}
										</Link>
										<span className="block text-xs text-muted-foreground">
											{DATE_FMT.format(new Date(order.createdAt))}
										</span>
									</td>
									<td className="px-4 py-3">
										<span className="block text-sm font-medium text-foreground">
											{order.customerName || "â€”"}
										</span>
										<span className="block text-xs text-muted-foreground">{order.email}</span>
									</td>
									<td className="px-4 py-3 text-sm font-medium text-foreground">
										{formatPrice(order.total, { currency: order.currencyCode })}
									</td>
									<td className="px-4 py-3">
										<span
											className={cn(
												"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
												BADGE_TONE_CLASS[status.tone],
											)}
										>
											{status.label}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}
