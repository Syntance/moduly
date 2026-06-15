import { authorizeCustomerRequest } from "../lib/authorize-request";
import { getCustomerOrders } from "../lib/orders";
import { CustomerLogin } from "../components/customer-login";

export default async function OdstapieniePage() {
	const email = await authorizeCustomerRequest();
	if (!email) return <CustomerLogin />;

	const orders = await getCustomerOrders(email);
	const eligible = orders.filter((o) => o.canReturn);

	return (
		<div className="space-y-6">
			<h1 className="font-serif text-3xl text-foreground">Odstąpienie od umowy</h1>
			<p className="text-sm text-muted-foreground">
				Masz 14 dni od dostawy na odstąpienie bez podania przyczyny.
			</p>
			{eligible.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Brak zamówień z aktywnym terminem odstąpienia.
				</p>
			) : (
				<ul className="space-y-3">
					{eligible.map((order) => (
						<li
							key={order.id}
							className="rounded-xl border border-border bg-card p-4 text-sm"
						>
							Zamówienie #{order.displayId} — pozostało {order.withdrawalDaysLeft} dni
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
