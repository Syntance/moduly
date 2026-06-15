import { authorizeCustomerRequest } from "../lib/authorize-request";
import { getCustomerOrders } from "../lib/orders";
import { CustomerLogin } from "../components/customer-login";

export default async function ReklamacjePage() {
	const email = await authorizeCustomerRequest();
	if (!email) return <CustomerLogin />;

	const orders = await getCustomerOrders(email);
	const eligible = orders.filter((o) => o.canClaim);

	return (
		<div className="space-y-6">
			<h1 className="font-serif text-3xl text-foreground">Reklamacje</h1>
			{eligible.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Brak zamówień z aktywnym terminem reklamacji.
				</p>
			) : (
				<ul className="space-y-3">
					{eligible.map((order) => (
						<li
							key={order.id}
							className="rounded-xl border border-border bg-card p-4 text-sm"
						>
							Zamówienie #{order.displayId} — złóż reklamację przez API{" "}
							<code className="font-mono text-xs">/api/claims/create</code>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
