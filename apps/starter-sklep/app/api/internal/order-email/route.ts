import { NextResponse } from "next/server";
import { z } from "zod";
import { formatPrice } from "@moduly/commerce";
import { sendTransactionalEmail } from "@moduly/magazyn-emails/send-transactional";

export const maxDuration = 30;

const snapshotSchema = z.object({
	email: z.string().email(),
	displayId: z.number().int().positive(),
	total: z.number().nonnegative(),
	itemTotal: z.number().nonnegative().optional(),
	shippingTotal: z.number().nonnegative().optional(),
	currencyCode: z.string().optional(),
});

const bodySchema = z.object({
	order_id: z.string().min(1),
	type: z.enum(["placed", "bank_transfer_pending"]),
	snapshot: snapshotSchema.optional(),
});

function internalSecret(): string | undefined {
	return (
		process.env.ORDER_EMAIL_INTERNAL_SECRET?.replace(/\r\n/g, "").trim() ||
		process.env.MEDUSA_REVALIDATE_SECRET?.replace(/\r\n/g, "").trim() ||
		undefined
	);
}

function bankTransferBlock(displayId: number): string {
	const iban = process.env.BANK_TRANSFER_IBAN?.trim();
	const swift = process.env.BANK_TRANSFER_SWIFT?.trim();
	if (!iban) return "";
	return `<h3>Dane do przelewu</h3>
<ul>
  <li><strong>Numer konta:</strong> ${iban}</li>
  ${swift ? `<li><strong>SWIFT/BIC:</strong> ${swift}</li>` : ""}
  <li><strong>Tytuł przelewu:</strong> Zamówienie #${displayId}</li>
</ul>
<p>Wysyłkę realizujemy po zaksięgowaniu wpłaty.</p>`;
}

/**
 * POST /api/internal/order-email
 *
 * Wysyłka maili zamówieniowych (Resend). Wołane server-to-server z backendu
 * Medusa (`order-email-dispatch.ts` → subscriber `order.placed` / reconcile /
 * notify-*). Autoryzacja: `x-order-email-secret`. Idempotencję trzyma backend
 * (flaga `email_sent_*` w metadata zamówienia), więc tu po prostu wysyłamy.
 */
export async function POST(request: Request) {
	const expected = internalSecret();
	const provided = request.headers.get("x-order-email-secret")?.trim();
	if (!expected || !provided || provided !== expected) {
		return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
	}

	const { type, snapshot } = parsed.data;
	if (!snapshot) {
		// Brak danych do złożenia treści maila — backend i tak oznaczy jako wysłane,
		// więc zwracamy ok (nie blokujemy domknięcia zamówienia).
		return NextResponse.json({ ok: true, skipped: true, reason: "no-snapshot" });
	}

	const currency = (snapshot.currencyCode ?? "PLN").toUpperCase();
	const amount = formatPrice(snapshot.total, "pl-PL", currency);
	const isBankTransfer = type === "bank_transfer_pending";

	const subject = isBankTransfer
		? `Zamówienie #${snapshot.displayId} — dane do przelewu`
		: `Potwierdzenie zamówienia #${snapshot.displayId}`;

	const html = `<p>Dziękujemy za zamówienie <strong>#${snapshot.displayId}</strong>.</p>
<p>Kwota: <strong>${amount}</strong></p>
${isBankTransfer ? bankTransferBlock(snapshot.displayId) : "<p>Płatność potwierdzona. Realizujemy zamówienie.</p>"}`;

	const text = isBankTransfer
		? `Zamówienie #${snapshot.displayId}\nKwota: ${amount}\nWykonaj przelew na konto sklepu z tytułem "Zamówienie #${snapshot.displayId}".`
		: `Zamówienie #${snapshot.displayId} potwierdzone. Kwota: ${amount}.`;

	const result = await sendTransactionalEmail({
		to: snapshot.email,
		subject,
		html,
		text,
	});

	if (!result.ok) {
		return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
	}
	return NextResponse.json({ ok: true, skipped: result.skipped ?? false });
}
