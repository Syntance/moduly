/**
 * Race obietnicy z limitem czasu — SDK nie przyjmuje AbortSignal w metodach wysokiego poziomu.
 */
export async function withMedusaTimeout<T>(
	promise: Promise<T>,
	ms = 30_000,
	label = "medusa",
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => { reject(new Error(`${label}: przekroczono limit ${ms}ms`)); }, ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}
