"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@moduly/ui";
import type { ReturnStatus } from "@moduly/types";
import { updateReturnStatusAction } from "./actions";

type Props = {
	returnId: string;
	currentStatus: ReturnStatus;
};

export function ReturnActions({ returnId, currentStatus }: Props) {
	const [loading, setLoading] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");
	const [showRejectForm, setShowRejectForm] = useState(false);
	const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
		null,
	);
	const router = useRouter();

	async function handleStatusChange(
		newStatus: ReturnStatus,
		extra?: { rejectionReason?: string; adminNotes?: string },
	) {
		setLoading(true);
		setMessage(null);
		try {
			const result = await updateReturnStatusAction(returnId, newStatus, extra);
			if (result.ok) {
				setMessage({ type: "ok", text: "Status zaktualizowany." });
				router.refresh();
				setShowRejectForm(false);
			} else {
				setMessage({
					type: "err",
					text: result.error ?? "Nie udało się zaktualizować statusu.",
				});
			}
		} catch {
			setMessage({ type: "err", text: "Nie udało się połączyć z serwerem." });
		} finally {
			setLoading(false);
		}
	}

	function handleReject() {
		if (!rejectionReason.trim()) {
			setMessage({ type: "err", text: "Podaj powód odrzucenia." });
			return;
		}
		handleStatusChange("rejected", { rejectionReason });
	}

	if (currentStatus === "refunded" || currentStatus === "canceled") {
		return (
			<div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
				Wniosek zakończony — brak dostępnych akcji
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h3 className="font-serif text-lg text-foreground">Akcje</h3>

			{message ? (
				<p
					role="status"
					className={
						message.type === "ok"
							? "text-sm text-emerald-700 dark:text-emerald-400"
							: "text-sm text-destructive"
					}
				>
					{message.text}
				</p>
			) : null}

			{currentStatus === "pending_approval" ? (
				<div className="flex gap-2">
					<Button
						onClick={() => handleStatusChange("approved")}
						disabled={loading}
						variant="default"
						size="sm"
					>
						Zaakceptuj wniosek
					</Button>
					<Button
						onClick={() => { setShowRejectForm(!showRejectForm); }}
						disabled={loading}
						variant="outline"
						size="sm"
					>
						Odrzuć
					</Button>
				</div>
			) : null}

			{showRejectForm ? (
				<div className="space-y-2 rounded-lg border border-border p-4">
					<label htmlFor="reject-reason" className="text-sm font-medium">
						Powód odrzucenia
					</label>
					<textarea
						id="reject-reason"
						value={rejectionReason}
						onChange={(e) => { setRejectionReason(e.target.value); }}
						className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
					/>
					<Button
						onClick={handleReject}
						disabled={loading}
						variant="destructive"
						size="sm"
					>
						Potwierdź odrzucenie
					</Button>
				</div>
			) : null}

			{currentStatus === "approved" ? (
				<Button
					onClick={() => handleStatusChange("shipped")}
					disabled={loading}
					variant="default"
					size="sm"
				>
					Oznacz jako wysłany
				</Button>
			) : null}

			{currentStatus === "shipped" ? (
				<Button
					onClick={() => handleStatusChange("received")}
					disabled={loading}
					variant="default"
					size="sm"
				>
					Oznacz jako otrzymany
				</Button>
			) : null}

			{currentStatus === "received" ? (
				<Button
					onClick={() => handleStatusChange("refunded")}
					disabled={loading}
					variant="default"
					size="sm"
				>
					Zwróć środki
				</Button>
			) : null}
		</div>
	);
}
