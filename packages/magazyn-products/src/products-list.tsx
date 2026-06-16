"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Pencil, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { formatPrice } from "@moduly/magazyn-core/client";
import { cn } from "@moduly/ui";
import { Input } from "@moduly/ui";
import type { AdminProductRow } from "./store";
import { DeleteProductButton } from "./delete-product-button";
import { DuplicateProductButton } from "./duplicate-product-button";
import { ProductThumbnail } from "./product-thumbnail";

type SortColumn = "title" | "category" | "price" | "status";
type SortDirection = "asc" | "desc";
type SortState = { column: SortColumn; direction: SortDirection };

const DEFAULT_SORT: SortState = { column: "title", direction: "asc" };

type ColumnDef = { id: SortColumn; label: string; className?: string };

const COLUMNS: ColumnDef[] = [
	{ id: "title", label: "Produkt" },
	{ id: "category", label: "Kategoria", className: "hidden sm:table-cell" },
	{ id: "price", label: "Cena" },
	{ id: "status", label: "Status", className: "hidden md:table-cell" },
];

const STATUS_OPTIONS = [
	{ value: "all", label: "Wszystkie statusy" },
	{ value: "published", label: "Opublikowane" },
	{ value: "draft", label: "Szkice" },
] as const;

function compareProducts(a: AdminProductRow, b: AdminProductRow, sort: SortState): number {
	const dir = sort.direction === "asc" ? 1 : -1;

	switch (sort.column) {
		case "title":
			return a.title.localeCompare(b.title, "pl") * dir;
		case "category": {
			const aCat = a.categoryName ?? "";
			const bCat = b.categoryName ?? "";
			if (!aCat && !bCat) return 0;
			if (!aCat) return dir;
			if (!bCat) return -dir;
			return aCat.localeCompare(bCat, "pl") * dir;
		}
		case "price": {
			const aPrice = a.price ?? -1;
			const bPrice = b.price ?? -1;
			return (aPrice - bPrice) * dir;
		}
		case "status":
			return a.status.localeCompare(b.status, "pl") * dir;
		default:
			return 0;
	}
}

function matchesSearch(product: AdminProductRow, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return [product.title, product.handle, product.categoryName ?? "", product.id]
		.join(" ")
		.toLowerCase()
		.includes(q);
}

function PriceCell({ product }: { product: AdminProductRow }) {
	if (product.price == null) return <span className="text-sm text-muted-foreground">— brak ceny</span>;
	return <span className="text-sm font-medium text-foreground">{formatPrice(product.price)}</span>;
}

function StatusBadge({ status }: { status: AdminProductRow["status"] }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
				status === "published"
					? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
					: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
			)}
		>
			{status === "published" ? "Opublikowany" : "Szkic"}
		</span>
	);
}

function CategoryCell({ categoryName }: { categoryName: string | null }) {
	if (!categoryName) {
		return (
			<span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
				Brak kategorii
			</span>
		);
	}
	return <span className="text-sm text-muted-foreground">{categoryName}</span>;
}

export function ProductsList({ products }: { products: AdminProductRow[] }) {
	const base = `${getModulyConfig().basePath}/panel/produkty`;

	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

	const categoryOptions = useMemo(() => {
		const names = new Set<string>();
		let hasUncategorized = false;
		for (const product of products) {
			if (product.categoryName) {
				names.add(product.categoryName);
			} else {
				hasUncategorized = true;
			}
		}
		return {
			categories: [...names].sort((a, b) => a.localeCompare(b, "pl")),
			hasUncategorized,
		};
	}, [products]);

	const hasFilters = query.trim().length > 0 || statusFilter !== "all" || categoryFilter !== "all";

	const filtered = useMemo(() => {
		const result = products.filter((product) => {
			if (!matchesSearch(product, query)) return false;
			if (statusFilter !== "all" && product.status !== statusFilter) return false;
			if (categoryFilter === "uncategorized") {
				if (product.categoryName !== null) return false;
			} else if (categoryFilter !== "all" && product.categoryName !== categoryFilter) {
				return false;
			}
			return true;
		});
		return [...result].sort((a, b) => compareProducts(a, b, sort));
	}, [products, query, statusFilter, categoryFilter, sort]);

	function toggleSort(column: SortColumn) {
		setSort((current) =>
			current.column === column
				? { column, direction: current.direction === "asc" ? "desc" : "asc" }
				: { column, direction: column === "price" ? "desc" : "asc" },
		);
	}

	function clearFilters() {
		setQuery("");
		setStatusFilter("all");
		setCategoryFilter("all");
		setSort(DEFAULT_SORT);
	}

	const selectClass =
		"h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

	if (products.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
				<span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
					<Inbox className="size-6" aria-hidden />
				</span>
				<p className="text-sm text-muted-foreground">Brak produktów. Dodaj pierwszy, klikając „Dodaj produkt".</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="relative max-w-md flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						type="search"
						value={query}
						onChange={(e) => { setQuery(e.target.value); }}
						placeholder="Szukaj: nazwa, slug, kategoria…"
						className="pl-9"
						aria-label="Szukaj produktów"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={statusFilter}
						onChange={(e) => { setStatusFilter(e.target.value); }}
						className={selectClass}
						aria-label="Filtr statusu"
					>
						{STATUS_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
					<select
						value={categoryFilter}
						onChange={(e) => { setCategoryFilter(e.target.value); }}
						className={selectClass}
						aria-label="Filtr kategorii"
					>
						<option value="all">Wszystkie kategorie</option>
						{categoryOptions.hasUncategorized && (
							<option value="uncategorized">Brak kategorii</option>
						)}
						{categoryOptions.categories.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
					</select>
					{hasFilters ? (
						<button
							type="button"
							onClick={clearFilters}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<X className="size-3.5" aria-hidden />
							Wyczyść
						</button>
					) : null}
				</div>
			</div>

			<p className="text-sm text-muted-foreground">
				{filtered.length === products.length
					? `${products.length} ${products.length === 1 ? "pozycja" : "pozycji"} w magazynie`
					: `Pokazano ${filtered.length} z ${products.length} pozycji`}
			</p>

			{filtered.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
					Brak wyników dla wybranych kryteriów.
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-border">
					<table className="w-full border-collapse text-left">
						<thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
							<tr>
								{COLUMNS.map((col) => {
									const active = sort.column === col.id;
									const SortIcon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
									return (
										<th key={col.id} className={cn("px-4 py-3 font-medium", col.className)}>
											<button
												type="button"
												onClick={() => { toggleSort(col.id); }}
												className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
												aria-label={`Sortuj: ${col.label}`}
												aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
											>
												{col.label}
												<SortIcon className={cn("size-3.5", active ? "text-foreground" : "opacity-40")} aria-hidden />
											</button>
										</th>
									);
								})}
								<th className="px-4 py-3 text-right font-medium">Akcje</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filtered.map((product) => (
								<tr key={product.id} className="bg-card transition-colors hover:bg-muted/30">
									<td className="px-4 py-3">
										<Link href={`${base}/${product.id}`} className="flex items-center gap-3 focus-visible:outline-none">
											<span className="relative size-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
												{product.thumbnail ? <ProductThumbnail url={product.thumbnail} /> : null}
											</span>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium text-foreground">{product.title}</span>
												<span className="block truncate text-xs text-muted-foreground">/{product.handle}</span>
											</span>
										</Link>
									</td>
									<td className="hidden px-4 py-3 sm:table-cell">
										<CategoryCell categoryName={product.categoryName} />
									</td>
									<td className="px-4 py-3">
										<PriceCell product={product} />
									</td>
									<td className="hidden px-4 py-3 md:table-cell">
										<StatusBadge status={product.status} />
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<Link
												href={`${base}/${product.id}`}
												aria-label={`Edytuj ${product.title}`}
												className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
											>
												<Pencil className="size-4" aria-hidden />
											</Link>
											<DuplicateProductButton id={product.id} title={product.title} />
											<DeleteProductButton id={product.id} title={product.title} />
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
