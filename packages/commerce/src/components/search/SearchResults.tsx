import Link from "next/link";
import Image from "next/image";
import type { ProductSearchResult } from "@moduly/types";
import { formatPrice } from "../../format";

export interface SearchResultsProps {
	results: ProductSearchResult[];
	onSelect: () => void;
	/** Buduje href produktu z handle — domyślnie `/sklep/${handle}`. */
	productHref?: (handle: string) => string;
}

export function SearchResults({
	results,
	onSelect,
	productHref = (handle) => `/sklep/${handle}`,
}: SearchResultsProps) {
	if (results.length === 0) {
		return (
			<p className="text-center text-sm text-brand-400 py-8">
				Brak wyników. Spróbuj innej frazy.
			</p>
		);
	}

	return (
		<ul className="space-y-2">
			{results.map((product) => {
				const minPrice = Math.min(...(product.variant_prices ?? [0]));
				return (
					<li key={product.id}>
						<Link
							href={productHref(product.handle)}
							onClick={onSelect}
							className="flex items-center gap-4 rounded-lg p-3 hover:bg-brand-50 transition-colors"
						>
							<div className="relative h-14 w-[2.625rem] shrink-0 overflow-hidden rounded-md bg-brand-50">
								{product.thumbnail ? (
									<>
										<div className="absolute inset-0 bg-brand-100" aria-hidden />
										<Image
											src={product.thumbnail}
											alt={product.title}
											fill
											loading="lazy"
											quality={75}
											sizes="42px"
											className="relative z-10 object-cover"
										/>
									</>
								) : (
									<div className="h-full w-full flex items-center justify-center text-brand-300 text-xs">
										Brak
									</div>
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-base font-medium text-brand-900 truncate">
									{product.title}
								</p>
								<p className="text-xs text-brand-500 line-clamp-1">
									{product.description}
								</p>
							</div>
							<span className="text-sm font-semibold tabular-nums text-brand-800">
								{minPrice > 0 ? `od ${formatPrice(minPrice)}` : "—"}
							</span>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
