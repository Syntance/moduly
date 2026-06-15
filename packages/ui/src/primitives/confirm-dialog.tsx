"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Button } from "./button";

type Props = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
	busy?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

/** Modal potwierdzenia — zamiast natywnego `window.confirm`. */
export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Potwierdź",
	cancelLabel = "Anuluj",
	variant = "default",
	busy = false,
	onConfirm,
	onCancel,
}: Props) {
	const titleId = useId();
	const descId = useId();

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !busy) onCancel();
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [open, busy, onCancel]);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			<button
				type="button"
				className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
				onClick={busy ? undefined : onCancel}
				aria-label="Zamknij"
				tabIndex={-1}
			/>
			<div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
				<h2 id={titleId} className="font-serif text-lg font-semibold text-foreground">
					{title}
				</h2>
				<p id={descId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
					{description}
				</p>
				<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="outline" onClick={onCancel} disabled={busy}>
						{cancelLabel}
					</Button>
					<Button
						variant={variant === "destructive" ? "destructive" : "default"}
						onClick={onConfirm}
						disabled={busy}
						className={cn(
							variant === "destructive" &&
								"border-transparent bg-destructive text-white hover:bg-destructive/90",
						)}
					>
						{busy ? "Przetwarzanie…" : confirmLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
