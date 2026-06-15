import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Potwierdzenie zamówienia",
	robots: { index: false },
};

type Props = { searchParams: Promise<{ order_id?: string; display_id?: string; payment?: string }> };

export default async function OrderConfirmationPage({ searchParams }: Props) {
	const { order_id, display_id, payment } = await searchParams;
	const label = display_id ? `#${display_id}` : order_id ? order_id.slice(0, 8) : null;

	return (
		<div className="mx-auto max-w-xl px-4 py-16 text-center">
			<h1 className="font-serif text-3xl text-foreground">Dziękujemy za zamówienie</h1>
			{label ? (
				<p className="mt-4 text-muted-foreground">
					Numer zamówienia: <strong className="text-foreground">{label}</strong>
				</p>
			) : null}
			{payment === "bank_transfer" ? (
				<p className="mt-4 text-sm text-muted-foreground">
					Instrukcje płatności przelewem wysłaliśmy na Twój adres e-mail.
				</p>
			) : (
				<p className="mt-4 text-sm text-muted-foreground">
					Potwierdzenie wysłaliśmy na Twój adres e-mail.
				</p>
			)}
			<a
				href="/sklep"
				className="mt-8 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Kontynuuj zakupy
			</a>
		</div>
	);
}
