import { formatPrice } from "@moduly/commerce";

type BankTransferInstructionsProps = {
	/** Numer zamówienia (display_id) — tytuł przelewu. */
	displayId?: number | string;
	/** Kwota do zapłaty w groszach (integer). */
	totalMinor?: number;
	currencyCode?: string;
	/** Dane rachunku — z ENV (BANK_TRANSFER_IBAN / SWIFT) przekazane przez stronę. */
	iban?: string;
	swift?: string;
	recipient?: string;
};

/**
 * Instrukcja przelewu tradycyjnego — widoczna OD RAZU na potwierdzeniu (nie
 * tylko mailem). Compliance + UX: klient musi wiedzieć ile, na jakie konto i
 * z jakim tytułem zapłacić.
 */
export function BankTransferInstructions({
	displayId,
	totalMinor,
	currencyCode = "PLN",
	iban,
	swift,
	recipient,
}: BankTransferInstructionsProps) {
	const title = displayId ? `Zamówienie #${displayId}` : "Zamówienie";
	const amount =
		typeof totalMinor === "number"
			? formatPrice(totalMinor, "pl-PL", currencyCode)
			: null;

	return (
		<section
			aria-labelledby="bank-transfer-heading"
			className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
		>
			<h2 id="bank-transfer-heading" className="text-base font-semibold">
				Dane do przelewu
			</h2>
			<p className="mt-2 text-amber-800">
				Aby sfinalizować zamówienie, wykonaj przelew tradycyjny na poniższe konto.
				Wysyłkę realizujemy po zaksięgowaniu wpłaty.
			</p>
			<dl className="mt-4 grid gap-2">
				{recipient ? (
					<div className="flex justify-between gap-4">
						<dt className="text-amber-700">Odbiorca</dt>
						<dd className="font-medium">{recipient}</dd>
					</div>
				) : null}
				{iban ? (
					<div className="flex justify-between gap-4">
						<dt className="text-amber-700">Numer konta</dt>
						<dd className="font-mono font-medium">{iban}</dd>
					</div>
				) : null}
				{swift ? (
					<div className="flex justify-between gap-4">
						<dt className="text-amber-700">SWIFT/BIC</dt>
						<dd className="font-mono font-medium">{swift}</dd>
					</div>
				) : null}
				<div className="flex justify-between gap-4">
					<dt className="text-amber-700">Tytuł przelewu</dt>
					<dd className="font-medium">{title}</dd>
				</div>
				{amount ? (
					<div className="flex justify-between gap-4">
						<dt className="text-amber-700">Kwota</dt>
						<dd className="font-semibold">{amount}</dd>
					</div>
				) : null}
			</dl>
		</section>
	);
}
