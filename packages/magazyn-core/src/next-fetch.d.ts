/** Rozszerzenie fetch w Next.js App Router (cache/revalidate). */
declare global {
	interface RequestInit {
		next?: {
			revalidate?: number | false;
			tags?: string[];
		};
	}
}

export {};
