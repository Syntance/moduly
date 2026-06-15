import { authorizeCustomerRequest } from "../lib/authorize-request";
import { getCustomerOrders } from "../lib/orders";
import { CustomerLogin } from "../components/customer-login";
import { CustomerOrdersOverview } from "../components/customer-orders-overview";

export default async function KontoPage() {
	const email = await authorizeCustomerRequest();

	if (!email) {
		return <CustomerLogin />;
	}

	const orders = await getCustomerOrders(email);

	return (
		<div className="space-y-8">
			<header>
				<h1 className="font-serif text-3xl text-foreground">Moje konto</h1>
				<p className="mt-2 text-sm text-muted-foreground">{email}</p>
			</header>
			<CustomerOrdersOverview orders={orders} />
		</div>
	);
}
