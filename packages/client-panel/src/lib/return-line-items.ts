import type { CustomerOrder } from "./orders";

export type CustomerReturnLineItem = {
	orderLineItemId: string;
	productTitle: string;
	quantity: number;
};

export function getLineItemsBlockedByOtherCases(order: CustomerOrder): Set<string> {
	return new Set([
		...order.claims.flatMap((c) => c.itemIds),
		...order.withdrawals.flatMap((w) => w.itemIds),
	]);
}

export function validateReturnLineItemSelection(
	orderItems: CustomerOrder["items"],
	selectedIds: string[],
	excludedIds: Set<string>,
): string | null {
	const eligible = orderItems.filter((item) => !excludedIds.has(item.id));
	if (eligible.length === 0) {
		return "Wszystkie produkty z tego zamówienia są już objęte inną sprawą.";
	}
	if (selectedIds.length === 0) {
		return "Wybierz produkt, którego dotyczy zgłoszenie.";
	}
	if (eligible.length > 1 && selectedIds.length !== 1) {
		return "Wybierz dokładnie jeden produkt z zamówienia.";
	}
	const picked = selectedIds[0];
	if (!picked || !eligible.some((item) => item.id === picked)) {
		return "Wybrany produkt nie jest dostępny do zgłoszenia.";
	}
	return null;
}
