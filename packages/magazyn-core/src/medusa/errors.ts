/** Brak / wygasła sesja — strona ma przekierować na ekran logowania. */
export class AdminUnauthorizedError extends Error {
	constructor(message = "Sesja wygasła. Zaloguj się ponownie.") {
		super(message);
		this.name = "AdminUnauthorizedError";
	}
}

/** Błąd zwrócony przez Medusa Admin API (z czytelnym komunikatem gdy się da). */
export class AdminApiError extends Error {
	readonly status: number;
	constructor(message: string, status: number) {
		super(translateAdminError(message));
		this.name = "AdminApiError";
		this.status = status;
	}
}

const ENTITY_LABELS: Record<string, string> = {
	"product category": "Kategoria produktu",
	product: "Produkt",
	"product variant": "Wariant produktu",
	"product collection": "Kolekcja",
	"product tag": "Tag produktu",
	"product type": "Typ produktu",
	region: "Region",
	"sales channel": "Kanał sprzedaży",
	"shipping profile": "Profil wysyłki",
	price: "Cena",
	order: "Zamówienie",
	customer: "Klient",
	user: "Użytkownik",
	file: "Plik",
};

function entityLabel(entity: string): string {
	return ENTITY_LABELS[entity.toLowerCase()] ?? entity;
}

/**
 * Tłumaczy typowe komunikaty Medusa Admin API na polski.
 * Nieznane komunikaty pozostają bez zmian (np. już po polsku z store.ts).
 */
export function translateAdminError(message: string): string {
	const trimmed = message.trim();
	if (!trimmed) return trimmed;

	const handleAlreadyExists = trimmed.match(
		/^([\w\s]+) with handle: ([^,]+), already exists\.?$/i,
	);
	if (handleAlreadyExists) {
		const entity = handleAlreadyExists[1]?.trim() ?? "Rekord";
		const handle = handleAlreadyExists[2]?.trim() ?? "";
		return `${entityLabel(entity)} o adresie „/${handle}” już istnieje. Odśwież listę — może być już w bazie.`;
	}

	const idAlreadyExists = trimmed.match(/^([\w\s]+) with id: ([^,]+), already exists\.?$/i);
	if (idAlreadyExists) {
		const entity = idAlreadyExists[1]?.trim() ?? "Rekord";
		const id = idAlreadyExists[2]?.trim() ?? "";
		return `${entityLabel(entity)} (ID: ${id}) już istnieje.`;
	}

	const idNotFound = trimmed.match(/^([\w\s]+) with id: ([^,]+) was not found\.?$/i);
	if (idNotFound) {
		const entity = idNotFound[1]?.trim() ?? "Rekord";
		const id = idNotFound[2]?.trim() ?? "";
		return `Nie znaleziono ${entityLabel(entity).toLowerCase()} (ID: ${id}).`;
	}

	const handleNotFound = trimmed.match(/^([\w\s]+) with handle: ([^,]+) was not found\.?$/i);
	if (handleNotFound) {
		const entity = handleNotFound[1]?.trim() ?? "Rekord";
		const handle = handleNotFound[2]?.trim() ?? "";
		return `Nie znaleziono ${entityLabel(entity).toLowerCase()} o adresie „/${handle}”.`;
	}

	if (/^invalid request\.?$/i.test(trimmed)) {
		return "Nieprawidłowe żądanie. Sprawdź wprowadzone dane.";
	}

	if (/^unauthorized\.?$/i.test(trimmed)) {
		return "Brak uprawnień. Zaloguj się ponownie.";
	}

	if (/^forbidden\.?$/i.test(trimmed)) {
		return "Brak dostępu do tej operacji.";
	}

	if (/^internal server error\.?$/i.test(trimmed)) {
		return "Błąd serwera. Spróbuj ponownie za chwilę.";
	}

	if (/application failed to respond/i.test(trimmed)) {
		return "Backend Medusa nie odpowiada (cold start Railway). Odśwież stronę za chwilę.";
	}

	if (/^bad gateway\.?$/i.test(trimmed)) {
		return "Backend Medusa chwilowo niedostępny (502). Odśwież stronę za chwilę.";
	}

	if (/^service unavailable\.?$/i.test(trimmed)) {
		return "Backend Medusa chwilowo niedostępny (503). Odśwież stronę za chwilę.";
	}

	if (/^gateway timeout\.?$/i.test(trimmed)) {
		return "Backend Medusa nie zdążył odpowiedzieć. Odśwież stronę za chwilę.";
	}

	if (/\balready exists\.?$/i.test(trimmed)) {
		return trimmed.replace(/\balready exists\.?$/i, "już istnieje.");
	}

	if (/\bwas not found\.?$/i.test(trimmed)) {
		return trimmed.replace(/\bwas not found\.?$/i, "— nie znaleziono.");
	}

	if (/\bnot found\.?$/i.test(trimmed)) {
		return trimmed.replace(/\bnot found\.?$/i, "— nie znaleziono.");
	}

	if (/^cannot delete\b/i.test(trimmed)) {
		return trimmed.replace(/^cannot delete/i, "Nie można usunąć");
	}

	if (/^cannot update\b/i.test(trimmed)) {
		return trimmed.replace(/^cannot update/i, "Nie można zaktualizować");
	}

	if (/^cannot create\b/i.test(trimmed)) {
		return trimmed.replace(/^cannot create/i, "Nie można utworzyć");
	}

	if (/^all fulfillments must be canceled before canceling an order\.?$/i.test(trimmed)) {
		return "Przed anulowaniem zamówienia trzeba anulować wszystkie realizacje. Spróbuj ponownie — system powinien zrobić to automatycznie.";
	}

	if (/^cannot cancel fulfillment.*already been shipped/i.test(trimmed)) {
		return "Nie można anulować zamówienia — przesyłka została już wysłana.";
	}

	return trimmed;
}

/** Alias wsteczny — ta sama funkcja co `translateAdminError`. */
export const translateAdminApiMessage = translateAdminError;

/** Wyciąga `message` z odpowiedzi błędu API i tłumaczy na polski. */
export function extractMessage(raw: string, fallback: string): string {
	try {
		const parsed = JSON.parse(raw) as { message?: string };
		const message = parsed.message?.trim();
		if (!message) return fallback;
		return translateAdminError(message);
	} catch {
		const trimmed = raw.trim();
		if (!trimmed) return fallback;
		return translateAdminError(trimmed);
	}
}
