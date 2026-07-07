import { loadAdmin } from "@moduly/magazyn-core";
import { listProductOptionsForPromo, listPromoCodes } from "./store";
import { PromotionsManager } from "./promotions-manager";

/**
 * Re-eksport w App Routerze — `dynamic` musi być w pliku trasy, nie re-eksportowane:
 *   export const dynamic = "force-dynamic";
 *   export { default } from "@moduly/magazyn-promotions";
 */
export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
	const [promos, products] = await loadAdmin(() =>
		Promise.all([listPromoCodes(), listProductOptionsForPromo()]),
	);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Kody promocyjne</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Twórz kody rabatowe, przypisuj je do produktów i opcjonalnie włącz darmową dostawę od wybranej kwoty koszyka.
				</p>
			</header>

			<PromotionsManager promos={promos} products={products} />
		</div>
	);
}
