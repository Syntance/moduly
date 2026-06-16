"use client";

import { useEffect, useRef } from "react";
import { useAnalytics } from "@moduly/analytics";

type Props = {
	productId: string;
	title: string;
	priceMinor: number;
	currency?: string;
};

export function ProductViewTracker({
	productId,
	title,
	priceMinor,
	currency = "PLN",
}: Props) {
	const analytics = useAnalytics();
	const sentRef = useRef(false);

	useEffect(() => {
		if (sentRef.current || priceMinor <= 0) return;
		sentRef.current = true;
		analytics.productView({
			currency,
			value: priceMinor,
			items: [
				{
					item_id: productId,
					item_name: title,
					price: priceMinor,
					quantity: 1,
				},
			],
		});
	}, [analytics, currency, priceMinor, productId, title]);

	return null;
}
