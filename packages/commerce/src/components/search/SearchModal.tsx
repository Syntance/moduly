"use client";

import { useEffect, useRef } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useSearch } from "../../hooks/useSearch";
import { SearchResults } from "./SearchResults";

export interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	productHref?: (handle: string) => string;
	onSearch?: (query: string, totalHits: number) => void;
}

export function SearchModal({
	isOpen,
	onClose,
	productHref,
	onSearch,
}: SearchModalProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const { query, results, isSearching, search, clearSearch } = useSearch({ onSearch });

	useEffect(() => {
		let focusTimer: ReturnType<typeof setTimeout> | null = null;
		if (isOpen) {
			document.body.style.overflow = "hidden";
			focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
		} else {
			document.body.style.overflow = "";
			clearSearch();
		}
		return () => {
			if (focusTimer) clearTimeout(focusTimer);
			document.body.style.overflow = "";
		};
	}, [isOpen, clearSearch]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				if (isOpen) onClose();
			}
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => { document.removeEventListener("keydown", handleKeyDown); };
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Wyszukiwarka">
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
				role="button"
				tabIndex={-1}
				aria-label="Zamknij wyszukiwarkę"
			/>
			<div className="fixed inset-x-4 top-24 mx-auto max-w-2xl rounded-xl bg-white shadow-2xl">
				<div className="flex items-center gap-2 border-b border-brand-100 px-4">
					<Search className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
					<div className="relative min-w-0 flex-1">
						<input
							ref={inputRef}
							type="search"
							placeholder="Szukaj produktów..."
							value={query}
							onChange={(e) => { search(e.target.value); }}
							className="w-full py-4 pr-9 text-sm outline-none placeholder:text-brand-400"
							aria-label="Szukaj produktów"
							enterKeyHint="search"
							autoComplete="off"
						/>
						{query.length > 0 ? (
							<button
								type="button"
								onClick={() => { search(""); }}
								className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
								aria-label="Wyczyść wyszukiwanie"
							>
								<X className="h-4 w-4" aria-hidden />
							</button>
						) : null}
					</div>
					{isSearching ? (
						<Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-400" aria-hidden />
					) : null}
					<button
						type="button"
						onClick={onClose}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
						aria-label="Zamknij wyszukiwarkę"
					>
						<X className="h-5 w-5" aria-hidden />
					</button>
					<button
						type="button"
						onClick={onClose}
						className="hidden shrink-0 rounded bg-brand-100 px-2 py-1 text-xs text-brand-600 lg:inline"
					>
						ESC
					</button>
				</div>

				<div className="max-h-96 overflow-y-auto p-4">
					{query.length >= 2 ? (
						<SearchResults
							results={results}
							onSelect={onClose}
							productHref={productHref}
						/>
					) : (
						<p className="text-center text-sm text-brand-400 py-8">
							Wpisz minimum 2 znaki, aby wyszukać...
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
