"use client";

import { Ban, Check, CreditCard, Package, PackageCheck, type LucideIcon, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@moduly/ui";
import { ConfirmDialog } from "@moduly/ui";
import { type OrderActionType, runOrderAction } from "./actions";

type ActionDef = {
	type: OrderActionType;
	label: string;
	icon: LucideIcon;
	variant: "primary" | "neutral" | "danger";
	confirm?: { title: string; description: string; confirmLabel: string };
	available: boolean;
};

type Props = {
	orderId: string;
	canCapture: boolean;
	/** P24 + captured — pomijamy księgowanie, od razu realizacja. */
	p24ConfirmedPaid?: boolean;
	canShip: boolean;
	canDeliver: boolean;
	canComplete: boolean;
	canCancel: boolean;
};

export function OrderActions({ orderId, canCapture, p24ConfirmedPaid = false, canShip, canDeliver, canComplete, canCancel }: Props) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [activeAction, setActiveAction] = useState<OrderActionType | null>(null);
	const [pendingConfirm, setPendingConfirm] = useState<ActionDef | null>(null);
	const [pending, startTransition] = useTransition();

	const actions: ActionDef[] = [
		{
			type: "capture",
			label: p24ConfirmedPaid ? "Rozpocznij realizację" : "Zaksięguj płatność",
			icon: p24ConfirmedPaid ? Package : CreditCard,
			variant: "primary",
			available: canCapture,
		},
		{ type: "ship", label: "Przesyłka wysłana", icon: Truck, variant: "neutral", available: canShip },
		{ type: "deliver", label: "Oznacz jako dostarczone", icon: PackageCheck, variant: "neutral", available: canDeliver },
		{ type: "complete", label: "Zakończ zamówienie", icon: Check, variant: "neutral", available: canComplete },
		{
			type: "cancel",
			label: "Anuluj zamówienie",
			icon: Ban,
			variant: "danger",
			confirm: {
				title: "Anulować zamówienie?",
				description: "Tej operacji nie można cofnąć. Klient nie otrzyma automatycznego zwrotu — upewnij się, że rozliczenie jest poprawne.",
				confirmLabel: "Tak, anuluj",
			},
			available: canCancel,
		},
	];

	const visible = actions.filter((action) => action.available);

	function execute(action: ActionDef) {
		setError(null);
		setActiveAction(action.type);
		startTransition(async () => {
			const result = await runOrderAction(orderId, action.type);
			setActiveAction(null);
			setPendingConfirm(null);
			if (!result.ok) {
				setError(result.error);
				return;
			}
			router.refresh();
		});
	}

	function run(action: ActionDef) {
		if (action.confirm) {
			setPendingConfirm(action);
			return;
		}
		execute(action);
	}

	if (visible.length === 0) {
		return <p className="text-sm text-muted-foreground">Brak dostępnych akcji dla tego statusu zamówienia.</p>;
	}

	return (
		<>
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-2">
					{visible.map((action) => {
						const Icon = action.icon;
						const busy = pending && activeAction === action.type;
						return (
							<button
								key={action.type}
								type="button"
								onClick={() => { run(action); }}
								disabled={pending}
								className={cn(
									"inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 disabled:opacity-50",
									action.variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50",
									action.variant === "neutral" && "border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring/50",
									action.variant === "danger" && "border border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30",
								)}
							>
								<Icon className="size-4" aria-hidden />
								{busy ? "Przetwarzanie…" : action.label}
							</button>
						);
					})}
				</div>
				{error ? (
					<p role="alert" className="text-sm text-destructive">{error}</p>
				) : null}
			</div>

			<ConfirmDialog
				open={pendingConfirm != null}
				title={pendingConfirm?.confirm?.title ?? ""}
				description={pendingConfirm?.confirm?.description ?? ""}
				confirmLabel={pendingConfirm?.confirm?.confirmLabel}
				variant={pendingConfirm?.variant === "danger" ? "destructive" : "default"}
				busy={pending}
				onCancel={() => {
					if (!pending) setPendingConfirm(null);
				}}
				onConfirm={() => {
					if (pendingConfirm) execute(pendingConfirm);
				}}
			/>
		</>
	);
}
