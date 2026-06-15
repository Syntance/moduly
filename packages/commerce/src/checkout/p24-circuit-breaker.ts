const STORAGE_KEY = "moduly_p24_failures_v1";
const MAX_FAILURES = 5;
const WINDOW_MS = 5 * 60 * 1000;

type FailureLog = { timestamps: number[] };

function readLog(): FailureLog {
	if (typeof window === "undefined") return { timestamps: [] };
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return { timestamps: [] };
		const parsed = JSON.parse(raw) as Partial<FailureLog>;
		return { timestamps: Array.isArray(parsed.timestamps) ? parsed.timestamps : [] };
	} catch {
		return { timestamps: [] };
	}
}

function writeLog(log: FailureLog): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(log));
	} catch {
		/* prywatny tryb */
	}
}

function recentFailureCount(now = Date.now()): number {
	return readLog().timestamps.filter((t) => now - t < WINDOW_MS).length;
}

/** Po serii nieudanych prób P24 ukrywamy metodę i kierujemy na przelew tradycyjny. */
export function isP24CircuitOpen(): boolean {
	return recentFailureCount() >= MAX_FAILURES;
}

export function recordP24Failure(): void {
	const now = Date.now();
	const recent = readLog().timestamps.filter((t) => now - t < WINDOW_MS);
	recent.push(now);
	writeLog({ timestamps: recent });
}

export function resetP24Circuit(): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		/* */
	}
}
