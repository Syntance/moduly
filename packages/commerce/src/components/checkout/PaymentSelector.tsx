"use client";

import { Building2, CreditCard } from "lucide-react";
import {
	CHECKOUT_VISIBLE_PROVIDER_IDS,
	PRZELEWY24_PROVIDER_ID,
	SYSTEM_PAYMENT_PROVIDER_ID,
} from "../../medusa/checkout";

interface PaymentOption {
	id: string;
	name: string;
	description: string;
	icon: typeof CreditCard;
	methods?: string[];
}

const PAYMENT_OPTIONS: PaymentOption[] = [
	{
		id: PRZELEWY24_PROVIDER_ID,
		name: "Przelewy24",
		description: "BLIK, szybki przelew online, karta — płatność od razu",
		icon: CreditCard,
		methods: ["BLIK", "Przelew online", "Karta"],
	},
	{
		id: SYSTEM_PAYMENT_PROVIDER_ID,
		name: "Przelew tradycyjny",
		description:
			"Wpłata na konto sklepu — zamówienie przyjmujemy od razu, realizacja po zaksięgowaniu przelewu",
		icon: Building2,
	},
];

export interface PaymentSelectorProps {
	selectedProviderId: string;
	onSelect: (providerId: string) => void;
	availableProviderIds?: string[];
	disabledProviderIds?: string[];
	p24CircuitOpen?: boolean;
	supportEmail?: string;
}

export function PaymentSelector({
	selectedProviderId,
	onSelect,
	availableProviderIds,
	disabledProviderIds = [],
	p24CircuitOpen = false,
	supportEmail = "kontakt@example.com",
}: PaymentSelectorProps) {
	const visibleIds = new Set<string>(CHECKOUT_VISIBLE_PROVIDER_IDS);
	const disabledSet = new Set(disabledProviderIds);
	const isRegistered = (id: string) =>
		!availableProviderIds || availableProviderIds.includes(id);

	const options = PAYMENT_OPTIONS.filter(
		(option) =>
			visibleIds.has(option.id) &&
			isRegistered(option.id) &&
			!disabledSet.has(option.id),
	);

	if (options.length === 0) {
		return (
			<p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-brand-800">
				Płatność online jest chwilowo niedostępna. Napisz na{" "}
				<a href={`mailto:${supportEmail}`} className="font-semibold underline">
					{supportEmail}
				</a>
				.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			{p24CircuitOpen && (
				<p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-brand-800">
					Płatność online Przelewy24 jest chwilowo niedostępna. Wybierz{" "}
					<strong>przelew tradycyjny</strong> — zamówienie przyjmujemy od razu.
				</p>
			)}
			{options.map((option) => {
				const Icon = option.icon;
				const isSelected = selectedProviderId === option.id;

				return (
					<button
						key={option.id}
						type="button"
						onClick={() => { onSelect(option.id); }}
						className={`flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-colors ${
							isSelected
								? "border-brand-800 bg-accent/15 shadow-sm"
								: "border-brand-200 hover:border-brand-400 hover:bg-brand-50"
						}`}
					>
						<div
							className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
								isSelected ? "border-brand-800" : "border-brand-300"
							}`}
						>
							{isSelected ? (
								<div className="h-2.5 w-2.5 rounded-full bg-brand-800" />
							) : null}
						</div>
						<Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
						<div className="flex-1">
							<span className="text-sm font-medium text-brand-900">{option.name}</span>
							<p className="mt-0.5 text-xs text-brand-500">{option.description}</p>

							{option.methods ? (
								<div className="mt-2 flex flex-wrap gap-1.5">
									{option.methods.map((method) => (
										<span
											key={method}
											className="rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-700"
										>
											{method}
										</span>
									))}
								</div>
							) : null}
						</div>
					</button>
				);
			})}
		</div>
	);
}
