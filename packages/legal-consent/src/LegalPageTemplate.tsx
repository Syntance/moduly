import type { ReactNode } from "react";

export type LegalBreadcrumb = {
	label: string;
	href?: string;
};

export type LegalPageTemplateProps = {
	/** Nazwa marki nad tytułem. */
	brandName: string;
	/** Nagłówek H1 strony prawnej. */
	title: string;
	/** Krótki opis / wstęp pod tytułem. */
	intro?: ReactNode;
	/** Opcjonalna ścieżka breadcrumbs. */
	breadcrumbs?: LegalBreadcrumb[];
	/** Treść dokumentu (sekcje, spis treści). */
	children: ReactNode;
	/** Dodatkowe klasy kontenera. */
	className?: string;
};

const articleClass =
	"text-[1.0625rem] leading-relaxed text-neutral-800 [&_a]:font-medium [&_a]:text-neutral-800 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-neutral-900";

/**
 * Szablon layoutu stron prawnych (regulamin, polityka prywatności, zwroty).
 * Użyj w `app/(shop)/regulamin/page.tsx` z treścią z `@moduly/legal-consent/templates/*`.
 */
export function LegalPageTemplate({
	brandName,
	title,
	intro,
	breadcrumbs,
	children,
	className,
}: LegalPageTemplateProps) {
	return (
		<div className={`border-b border-neutral-100 bg-neutral-50/30 ${className ?? ""}`}>
			<div className="container mx-auto px-4 py-8 pb-16 sm:py-12">
				{breadcrumbs && breadcrumbs.length > 0 ? (
					<nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-500">
						<ol className="flex flex-wrap items-center gap-2">
							{breadcrumbs.map((item, index) => (
								<li key={`${item.label}-${index}`} className="flex items-center gap-2">
									{index > 0 ? <span aria-hidden="true">/</span> : null}
									{item.href ? (
										<a
											href={item.href}
											className="hover:text-neutral-800 hover:underline"
										>
											{item.label}
										</a>
									) : (
										<span className="text-neutral-700">{item.label}</span>
									)}
								</li>
							))}
						</ol>
					</nav>
				) : null}

				<div className="mx-auto max-w-3xl">
					<p className="mb-2 text-center text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
						{brandName}
					</p>
					<h1 className="mb-6 text-center text-2xl font-bold tracking-wide text-neutral-900 sm:text-3xl">
						{title}
					</h1>
					{intro ? (
						<div className="mb-8 text-center text-sm text-neutral-600">{intro}</div>
					) : null}
					<article className={articleClass} lang="pl">
						<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
							{children}
						</div>
					</article>
				</div>
			</div>
		</div>
	);
}
