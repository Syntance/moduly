"use client";

import { formatPrice } from "@moduly/magazyn-core/client";
import type { CustomerOrder } from "../lib/orders";

type Props = {
	orders: CustomerOrder[];
};

export function CustomerOrdersOverview({ orders }: Props) {
	if (orders.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Brak zamówień przypisanych do tego adresu e-mail.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="font-serif text-xl text-foreground">Zamówienia</h2>
			<ul className="divide-y divide-border rounded-xl border border-border bg-card">
				{orders.map((order) => (
					<li key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
						<div>
							<p className="font-mono text-sm font-medium">#{order.displayId}</p>
							<p className="text-xs text-muted-foreground">
								{new Date(order.createdAt).toLocaleDateString("pl-PL")}
							</p>
						</div>
						<p className="text-sm font-medium">{formatPrice(order.total)}</p>
						<div className="flex gap-2 text-xs text-muted-foreground">
							{order.canReturn ? (
								<span>Odstąpienie: {order.withdrawalDaysLeft} dni</span>
							) : null}
							{order.canClaim ? (
								<span>Reklamacja: {order.claimDaysLeft} dni</span>
							) : null}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
