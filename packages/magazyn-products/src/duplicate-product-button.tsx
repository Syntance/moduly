"use client";

import { Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { duplicateProductAction } from "./actions";

export function DuplicateProductButton({ id, title }: { id: string; title: string }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	function handleDuplicate() {
		setError(null);
		startTransition(async () => {
			const result = await duplicateProductAction(id);
			if (!result.ok || !result.newId) {
				setError(result.error ?? "Nie udało się powielić produktu.");
				return;
			}
			router.push(`${getModulyConfig().basePath}/panel/produkty/${result.newId}`);
			router.refresh();
		});
	}

	return (
		<div className="relative">
			<button
				type="button"
				onClick={handleDuplicate}
				disabled={pending}
				aria-label={`Powiel ${title}`}
				title="Powiel produkt"
				className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
			>
				{pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Copy className="size-4" aria-hidden />}
			</button>
			{error ? (
				<p role="alert" className="absolute right-0 top-full z-10 mt-1 w-52 rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs text-destructive shadow-sm">
					{error}
				</p>
			) : null}
		</div>
	);
}
