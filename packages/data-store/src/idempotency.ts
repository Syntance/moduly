type IdempotencyRecord<T> = {
	result: T;
	expiresAt: number;
};

export type IdempotencyOptions = {
	/** Czas życia klucza w ms — domyślnie 24 h. */
	ttlMs?: number;
};

export type IdempotencyRunner = {
	run<T>(key: string, fn: () => Promise<T>): Promise<T>;
	has(key: string): boolean;
	delete(key: string): void;
	clear(): void;
};

function isExpired(expiresAt: number): boolean {
	return Date.now() > expiresAt;
}

/** Idempotency oparte o Mapę w pamięci — dev / single-instance. */
export function createMemoryIdempotency(
	options?: IdempotencyOptions,
): IdempotencyRunner {
	const ttlMs = options?.ttlMs ?? 24 * 60 * 60 * 1000;
	const store = new Map<string, IdempotencyRecord<unknown>>();
	const inflight = new Map<string, Promise<unknown>>();

	function purgeExpired(): void {
		const now = Date.now();
		for (const [key, record] of store) {
			if (record.expiresAt <= now) {
				store.delete(key);
			}
		}
	}

	return {
		has(key: string): boolean {
			purgeExpired();
			const record = store.get(key);
			return record != null && !isExpired(record.expiresAt);
		},

		delete(key: string): void {
			store.delete(key);
			inflight.delete(key);
		},

		clear(): void {
			store.clear();
			inflight.clear();
		},

		async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
			purgeExpired();

			const existing = store.get(key);
			if (existing && !isExpired(existing.expiresAt)) {
				return existing.result as T;
			}

			const pending = inflight.get(key);
			if (pending) {
				return (await pending) as T;
			}

			const promise = (async () => {
				const result = await fn();
				store.set(key, {
					result,
					expiresAt: Date.now() + ttlMs,
				});
				return result;
			})();

			inflight.set(key, promise);

			try {
				return (await promise);
			} finally {
				inflight.delete(key);
			}
		},
	};
}

export type DbIdempotencyAdapter = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlMs: number): Promise<void>;
};

/**
 * Idempotency z persystencją w DB (np. Redis/Postgres adapter).
 * Adapter musi serializować wynik jako JSON string.
 */
export function createDbIdempotency(
	adapter: DbIdempotencyAdapter,
	options?: IdempotencyOptions,
): IdempotencyRunner {
	const ttlMs = options?.ttlMs ?? 24 * 60 * 60 * 1000;
	const inflight = new Map<string, Promise<unknown>>();

	return {
		has(key: string): boolean {
			void key;
			return false;
		},

		delete(key: string): void {
			inflight.delete(key);
			void adapter.set(key, "", 1);
		},

		clear(): void {
			inflight.clear();
		},

		async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
			const cachedRaw = await adapter.get(key);
			if (cachedRaw) {
				return JSON.parse(cachedRaw) as T;
			}

			const pending = inflight.get(key);
			if (pending) {
				return (await pending) as T;
			}

			const promise = (async () => {
				const result = await fn();
				await adapter.set(key, JSON.stringify(result), ttlMs);
				return result;
			})();

			inflight.set(key, promise);

			try {
				return (await promise);
			} finally {
				inflight.delete(key);
			}
		},
	};
}

/** Buduje klucz idempotency z prefiksu i identyfikatorów. */
export function buildIdempotencyKey(
	prefix: string,
	...parts: Array<string | number>
): string {
	return [prefix, ...parts.map(String)].join(":");
}
