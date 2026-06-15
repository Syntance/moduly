"use client";

import { ChevronRight } from "lucide-react";
import {
	hasOrderLineItemPersonalizationDetails,
	parseLineItemFiles,
	parseLineItemLinks,
	parseLineItemTextFields,
	type LineItemFile,
} from "./lib/line-item-extras";
import { formatLineItemDetailsLines } from "./lib/format-line-item-for-email";
import { formatPrice } from "@moduly/magazyn-core/client";
import { cn } from "@moduly/ui";
import type { OrderLineItem } from "./order-types";
import { OrderTextFieldTile } from "./order-text-field-tile";

type Props = {
	item: OrderLineItem;
	currencyCode: string;
};

function FileTile({ file }: { file: LineItemFile }) {
	return (
		<a
			href={file.url}
			target="_blank"
			rel="noopener noreferrer"
			download={file.filename}
			className={cn(
				"inline-flex h-8 max-w-[12rem] items-center gap-2 overflow-hidden rounded-md border border-border bg-card px-2",
				"transition-colors hover:border-foreground/25 hover:bg-muted/40",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
			)}
			title={`Pobierz: ${file.filename}`}
		>
			<span className="min-w-0 truncate text-[11px] leading-none text-foreground">{file.filename}</span>
		</a>
	);
}

export function OrderLineItemRow({ item, currencyCode }: Props) {
	const { metadata } = item;
	const textFields = parseLineItemTextFields(metadata);
	const files = parseLineItemFiles(metadata);
	const links = parseLineItemLinks(metadata);
	const detailLines = formatLineItemDetailsLines(metadata);
	const showDetails = hasOrderLineItemPersonalizationDetails(metadata) || detailLines.length > 0;
	const priceOpts = { currency: currencyCode };

	return (
		<li className="py-4">
			<div className="flex items-start gap-3">
				<span className="relative block size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
					{item.thumbnail ? (

						<img src={item.thumbnail} alt="" className="size-full object-cover" />
					) : null}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-foreground">{item.title}</p>
					{detailLines.length > 0 ? (
						<ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
							{detailLines.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					) : null}
					{showDetails ? (
						<details className="group mt-2">
							<summary
								className={cn(
									"inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground",
									"hover:text-foreground [&::-webkit-details-marker]:hidden",
								)}
							>
								<ChevronRight
									className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
									aria-hidden
								/>
								Szczegóły
							</summary>
							<div className="mt-2 space-y-3 border-l border-border pl-3">
								{textFields.length > 0 ? (
									<div>
										<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											Pola tekstowe
										</p>
										<div className="grid gap-2 sm:grid-cols-2">
											{textFields.map((field) => (
												<OrderTextFieldTile
													key={`${field.label}-${field.value}`}
													label={field.label}
													value={field.value}
												/>
											))}
										</div>
									</div>
								) : null}

								{files.length > 0 ? (
									<div>
										<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											Pliki
										</p>
										<ul className="flex flex-wrap gap-1.5">
											{files.map((file) => (
												<li key={file.url}>
													<FileTile file={file} />
												</li>
											))}
										</ul>
									</div>
								) : null}

								{links.length > 0 ? (
									<div>
										<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											Linki QR
										</p>
										<ul className="space-y-1">
											{links.map((link) => (
												<li key={link.url}>
													<a
														href={link.url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-foreground underline-offset-2 hover:underline"
													>
														{link.url}
													</a>
												</li>
											))}
										</ul>
									</div>
								) : null}
							</div>
						</details>
					) : null}
				</div>
				<div className="shrink-0 text-right text-sm">
					<p className="text-muted-foreground">
						{item.quantity} × {formatPrice(item.unitPrice, priceOpts)}
					</p>
					<p className="font-medium text-foreground">{formatPrice(item.total, priceOpts)}</p>
				</div>
			</div>
		</li>
	);
}
