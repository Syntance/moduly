import { loadAdmin } from "@moduly/magazyn-core";
import { listAdminOrders } from "./store";
import { OrdersList } from "./orders-list";

/**
 * Lista zamówień. Re-eksportuj w `app{basePath}/(panel)/zamowienia/page.tsx`:
 *   export { default, dynamic } from "@magazyn/modules/orders/page";
 */
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
	const orders = await loadAdmin(listAdminOrders);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Zamówienia</h1>
				<p className="mt-1 text-sm text-muted-foreground">Wszystkie zamówienia ze sklepu — kliknij, aby zarządzać.</p>
			</header>

			<OrdersList orders={orders} />
		</div>
	);
}
