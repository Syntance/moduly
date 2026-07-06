"use client";

import { useCallback, useState } from "react";
import { useCart } from "@/hooks/useCart";

type PromoStatus = "idle" | "loading" | "success" | "error";

type Props = {
	/** Kompaktowy wariant w sidebarze checkout. */
	compact?: boolean;
};

export function PromoCodeField({ compact = false }: Props) {
	const { applyDiscount, removeDiscount, appliedPromoCodes, discountTotal } = useCart();
	const [code, setCode] = useState("");
	const [status, setStatus] = useState<PromoStatus>("idle");
	const [message, setMessage] = useState("");

	const visibleCode = appliedPromoCodes.find(
		(promoCode) => !promoCode.startsWith("__moduly_fs_"),
	);

	const handleApply = useCallback(async () => {
		const trimmed = code.trim();
		if (!trimmed || !applyDiscount) return;
		setStatus("loading");
		setMessage("");
		try {
			await applyDiscount(trimmed);
			if (typeof window !== "undefined") {
				localStorage.setItem("moduly_referral", trimmed);
			}
			setStatus("success");
			setMessage("Kod zastosowany");
			setCode("");
		} catch (error) {
			const utilized =
				error instanceof Error && error.message === "Kod wykorzystany";
			setStatus(utilized ? "success" : "error");
			setMessage(
				utilized ? "Kod wykorzystany" : "Kod nieprawidłowy lub wygasł",
			);
		}
	}, [applyDiscount, code]);

	const handleRemove = useCallback(async () => {
		if (!visibleCode || !removeDiscount) return;
		setStatus("loading");
		setMessage("");
		try {
			await removeDiscount(visibleCode);
			setStatus("idle");
			setMessage("");
			setCode("");
		} catch {
			setStatus("error");
			setMessage("Nie udało się usunąć kodu");
		}
	}, [removeDiscount, visibleCode]);

	return (
		<div className={compact ? "space-y-2" : "space-y-3 rounded-lg border border-brand-200 bg-white/60 p-4"}>
			{!compact ? (
				<div>
					<h3 className="text-sm font-semibold text-brand-800">Kod promocyjny</h3>
					<p className="mt-1 text-xs text-brand-500">
						Wpisz kod przed wyborem płatności — zobaczysz zniżkę w podsumowaniu.
					</p>
				</div>
			) : null}

			{visibleCode ? (
				<div className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-brand-50/80 px-3 py-2 text-sm">
					<div>
						<p className="font-medium text-brand-800">{visibleCode}</p>
						{discountTotal > 0 ? (
							<p className="text-xs text-brand-600">Zniżka aktywna</p>
						) : (
							<p className="text-xs text-brand-600">Kod aktywny</p>
						)}
					</div>
					<button
						type="button"
						onClick={() => void handleRemove()}
						disabled={status === "loading"}
						className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline disabled:opacity-50"
					>
						Usuń
					</button>
				</div>
			) : (
				<div className="flex gap-2">
					<input
						type="text"
						value={code}
						onChange={(e) => {
							setCode(e.target.value.toUpperCase());
							if (status !== "idle") setStatus("idle");
						}}
						placeholder="np. LATO2026"
						aria-label="Kod promocyjny"
						className="min-w-0 flex-1 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm uppercase text-brand-900 outline-none placeholder:normal-case placeholder:text-brand-400 focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
					/>
					<button
						type="button"
						onClick={() => void handleApply()}
						disabled={!code.trim() || status === "loading"}
						className="shrink-0 rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-brand-200 disabled:text-brand-500"
					>
						{status === "loading" ? "…" : "Zastosuj"}
					</button>
				</div>
			)}

			{message ? (
				<p
					className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-700"}`}
					role={status === "error" ? "alert" : "status"}
				>
					{message}
				</p>
			) : null}
		</div>
	);
}
