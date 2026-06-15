"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@moduly/ui";
import { BLOCK_META, PALETTE_BLOCKS } from "./block-meta";
import type { BlockType } from "./template-types";
import { editorBtnRounded } from "./editor-chrome";

export function AddBlockCallout({
	open,
	onClose,
	onAdd,
	anchorRef,
}: {
	open: boolean;
	onClose: () => void;
	onAdd: (type: BlockType) => void;
	anchorRef: RefObject<HTMLElement | null>;
}) {
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		function onPointerDown(event: MouseEvent) {
			const target = event.target as Node;
			if (panelRef.current?.contains(target)) return;
			if (anchorRef.current?.contains(target)) return;
			onClose();
		}
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousedown", onPointerDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousedown", onPointerDown);
		};
	}, [open, onClose, anchorRef]);

	if (!open) return null;

	return (
		<div
			ref={panelRef}
			role="dialog"
			aria-label="Dodaj sekcję"
			className="absolute right-0 top-full z-20 mt-1.5 w-[min(100%,16.5rem)] rounded-lg border border-border bg-card p-2.5 shadow-lg"
		>
			<p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
				Dodaj sekcję
			</p>
			<div className="grid grid-cols-2 gap-1.5">
				{PALETTE_BLOCKS.map((type) => {
					const Icon = BLOCK_META[type].icon;
					return (
						<button
							key={type}
							type="button"
							onClick={() => {
								onAdd(type);
								onClose();
							}}
							className={cn(
								editorBtnRounded,
								"inline-flex items-center gap-1.5 border border-input px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
							)}
						>
							<Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
							<span className="truncate">{BLOCK_META[type].label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
