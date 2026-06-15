"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@moduly/ui";
import { deleteProductAction } from "./actions";

export function DeleteProductButton({ id, title }: { id: string; title: string }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [confirmOpen, setConfirmOpen] = useState(false);

	function handleConfirm() {
		startTransition(async () => {
			await deleteProductAction(id);
			setConfirmOpen(false);
			router.refresh();
		});
	}

	return (
		<>
			<button
				type="button"
				onClick={() => { setConfirmOpen(true); }}
				disabled={pending}
				aria-label={`Usuń ${title}`}
				className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/30 disabled:opacity-50"
			>
				{pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
			</button>
			<ConfirmDialog
				open={confirmOpen}
				title="Usunąć produkt?"
				description={`Produkt „${title}" zostanie trwale usunięty. Tej operacji nie można cofnąć.`}
				confirmLabel="Usuń produkt"
				variant="destructive"
				busy={pending}
				onConfirm={handleConfirm}
				onCancel={() => { setConfirmOpen(false); }}
			/>
		</>
	);
}
