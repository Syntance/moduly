"use client";

import { useCallback, useRef, useState } from "react";
import { searchProducts } from "../meilisearch/client";
import type { ProductSearchResult } from "@moduly/types";

const DEBOUNCE_MS = 250;

export type UseSearchOptions = {
	onSearch?: (query: string, totalHits: number) => void;
};

export function useSearch(options: UseSearchOptions = {}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<ProductSearchResult[]>([]);
	const [totalHits, setTotalHits] = useState(0);
	const [isSearching, setIsSearching] = useState(false);

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);

	const search = useCallback(
		(q: string) => {
			setQuery(q);

			if (timerRef.current) clearTimeout(timerRef.current);

			if (q.length < 2) {
				setResults([]);
				setTotalHits(0);
				setIsSearching(false);
				return;
			}

			setIsSearching(true);

			timerRef.current = setTimeout(() => {
				const id = ++requestIdRef.current;

				searchProducts(q, { limit: 10 })
					.then((response) => {
						if (id !== requestIdRef.current) return;
						const hits = response.hits as unknown as ProductSearchResult[];
						setResults(hits);
						const estimated = response.estimatedTotalHits ?? 0;
						setTotalHits(estimated);
						options.onSearch?.(q, estimated);
					})
					.catch((err) => {
						if (id !== requestIdRef.current) return;
						console.error("[useSearch] Search failed:", err);
						setResults([]);
					})
					.finally(() => {
						if (id !== requestIdRef.current) return;
						setIsSearching(false);
					});
			}, DEBOUNCE_MS);
		},
		[options.onSearch],
	);

	const clearSearch = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		requestIdRef.current++;
		setQuery("");
		setResults([]);
		setTotalHits(0);
		setIsSearching(false);
	}, []);

	return {
		query,
		results,
		totalHits,
		isSearching,
		search,
		clearSearch,
	};
}
