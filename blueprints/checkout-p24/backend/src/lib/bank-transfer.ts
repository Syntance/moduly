/** Dane do przelewu tradycyjnego — nadpisywalne przez ENV na Railway. */
export type BankTransferDetails = {
	recipientName: string;
	iban: string;
	swift: string;
	addressLine1: string;
	addressLine2: string;
	paymentDays: number;
	transferTitlePrefix: string;
};

const DEFAULTS: BankTransferDetails = {
	recipientName: "Moduly Concept",
	iban: "PL58105011001000009085809698",
	swift: "INGBPLPW",
	addressLine1: "Jana Pawła II 93",
	addressLine2: "34-115 Ryczów",
	paymentDays: 5,
	transferTitlePrefix: "Zamówienie",
};

function trimEnv(value: string | undefined): string | undefined {
	const trimmed = value?.replace(/\r\n/g, "").trim();
	return trimmed || undefined;
}

export function getBankTransferDetails(): BankTransferDetails {
	const paymentDaysRaw = trimEnv(process.env.BANK_TRANSFER_PAYMENT_DAYS);
	const paymentDays = paymentDaysRaw ? Number.parseInt(paymentDaysRaw, 10) : DEFAULTS.paymentDays;

	return {
		recipientName: trimEnv(process.env.BANK_TRANSFER_RECIPIENT) ?? DEFAULTS.recipientName,
		iban: (trimEnv(process.env.BANK_TRANSFER_IBAN) ?? DEFAULTS.iban).replace(/\s+/g, ""),
		swift: trimEnv(process.env.BANK_TRANSFER_SWIFT) ?? DEFAULTS.swift,
		addressLine1: trimEnv(process.env.BANK_TRANSFER_ADDRESS_LINE1) ?? DEFAULTS.addressLine1,
		addressLine2: trimEnv(process.env.BANK_TRANSFER_ADDRESS_LINE2) ?? DEFAULTS.addressLine2,
		paymentDays: Number.isFinite(paymentDays) && paymentDays > 0 ? paymentDays : DEFAULTS.paymentDays,
		transferTitlePrefix: trimEnv(process.env.BANK_TRANSFER_TITLE_PREFIX) ?? DEFAULTS.transferTitlePrefix,
	};
}

export function formatIbanDisplay(iban: string): string {
	const compact = iban.replace(/\s+/g, "").toUpperCase();
	if (!compact) return "—";
	return compact.replace(/(.{4})/g, "$1 ").trim();
}

export function buildTransferTitle(displayId: number | string): string {
	const { transferTitlePrefix } = getBankTransferDetails();
	return `${transferTitlePrefix} #${displayId}`;
}

export function bankTransferEmailLines(displayId: number | string): {
	recipientName: string;
	ibanDisplay: string;
	swift: string;
	address: string;
	transferTitle: string;
	paymentDays: number;
} {
	const details = getBankTransferDetails();
	return {
		recipientName: details.recipientName,
		ibanDisplay: formatIbanDisplay(details.iban),
		swift: details.swift,
		address: `${details.addressLine1}, ${details.addressLine2}`,
		transferTitle: buildTransferTitle(displayId),
		paymentDays: details.paymentDays,
	};
}
