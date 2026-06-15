"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";
import { getModulyConfig } from "@moduly/magazyn-core/config";

type Props = { orderId: string; label: string; children: ReactNode };

export function OrderTableRow({ orderId, label, children }: Props) {
	const router = useRouter();
	const href = `${getModulyConfig().basePath}/panel/zamowienia/${orderId}`;

	function navigate() {
		router.push(href);
	}

	function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			navigate();
		}
	}

	return (
		<tr
			role="link"
			tabIndex={0}
			aria-label={label}
			onClick={navigate}
			onKeyDown={onKeyDown}
			className="cursor-pointer bg-card transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
		>
			{children}
		</tr>
	);
}
