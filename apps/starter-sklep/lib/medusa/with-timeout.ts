/**
 * Race obietnicy z limitem czasu.
 *
 * `@medusajs/js-sdk` nie przyjmuje `AbortSignal` w metodach wysokiego poziomu
 * (Config nie ma `timeout`/`fetch`), a reguła ecom-core zabrania fetchy Medusy
 * bez limitu. Ten helper zapobiega zawieszeniu UI/RSC, gdy backend nie
 * odpowiada — odrzuca oczekiwanie po `ms`. Uwaga: nie przerywa samego żądania
 * sieciowego (SDK tego nie wspiera), tylko przestaje na nie czekać.
 */
export async function withMedusaTimeout<T>(
	promise: Promise<T>,
	ms = 30_000,
	label = "medusa",
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${label}: przekroczono limit ${ms}ms`)), ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
