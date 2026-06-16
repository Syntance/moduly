import type { AnalyticsItem } from "@syntance/analytics-events";

/** GA4 oczekuje decimal w UI layer — konwersja z groszy. */
export function itemsToGa4(items: AnalyticsItem[]): Array<Record<string, unknown>> {
	return items.map((item) => ({
		item_id: item.item_id,
		item_name: item.item_name,
		price: item.price / 100,
		quantity: item.quantity,
		...(item.item_category ? { item_category: item.item_category } : {}),
	}));
}

export function valueToGa4(minorUnits: number): number {
	return minorUnits / 100;
}
