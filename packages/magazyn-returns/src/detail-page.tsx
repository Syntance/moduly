import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { formatPrice } from "@moduly/magazyn-core";
import type { ClaimRemedy } from "@moduly/types";
import { getMagazynReturnsConfig } from "./configure";
import { getReturnDetailAction } from "./actions";
import { ReturnActions } from "./return-actions";

const STATUS_LABELS: Record<string, string> = {
	pending_approval: "Oczekuje na akceptację",
	approved: "Zaakceptowany",
	shipped: "Wysłany",
	received: "Otrzymany",
	refunded: "Zwrócono środki",
	rejected: "Odrzucony",
	canceled: "Anulowany",
};

const CLAIM_REMEDY_LABELS: Record<ClaimRemedy, string> = {
	repair: "Naprawa",
	price_reduction: "Obniżenie ceny",
	withdrawal: "Odstąpienie od umowy",
};

export default async function ReturnDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const result = await getReturnDetailAction(id);
	const basePath = getMagazynReturnsConfig().basePath;

	if (!result.ok) notFound();

	const ret = result.return;
	const isClaim = ret.requestType === "claim";
	const typeLabel = isClaim ? "Reklamacja" : "Odstąpienie od umowy";

	return (
		<div className="space-y-6">
			<Link
				href={`${basePath}/zwroty`}
				className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Powrót
			</Link>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<div className="rounded-xl border border-border bg-card p-6">
						<h1 className="mb-4 font-serif text-2xl text-foreground">
							{typeLabel}: zamówienie #{ret.orderDisplayId}
						</h1>

						<dl className="grid grid-cols-2 gap-4 text-sm">
							{isClaim && ret.claimReferenceId ? (
								<div>
									<dt className="font-medium text-muted-foreground">Nr reklamacji</dt>
									<dd className="mt-1 font-mono text-foreground">
										{ret.claimReferenceId}
									</dd>
								</div>
							) : null}
							{isClaim && ret.claimRemedy ? (
								<div>
									<dt className="font-medium text-muted-foreground">Żądanie klienta</dt>
									<dd className="mt-1 text-foreground">
										{CLAIM_REMEDY_LABELS[ret.claimRemedy]}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="font-medium text-muted-foreground">E-mail klienta</dt>
								<dd className="mt-1 text-foreground">{ret.customerEmail}</dd>
							</div>
							<div>
								<dt className="font-medium text-muted-foreground">Status</dt>
								<dd className="mt-1 text-foreground">
									{STATUS_LABELS[ret.status] ?? ret.status}
								</dd>
							</div>
							<div className="col-span-2">
								<dt className="font-medium text-muted-foreground">Powód / opis</dt>
								<dd className="mt-1 whitespace-pre-wrap text-foreground">{ret.reason}</dd>
							</div>
						</dl>
					</div>

					<div className="rounded-xl border border-border bg-card p-6">
						<h2 className="mb-4 font-serif text-lg text-foreground">Pozycje</h2>
						<ul className="divide-y divide-border">
							{ret.items.map((item) => (
								<li key={item.orderLineItemId} className="flex justify-between py-3 text-sm">
									<span>
										{item.productTitle} × {item.quantity}
									</span>
									<span className="font-medium">
										{formatPrice(item.unitPrice * item.quantity)}
									</span>
								</li>
							))}
						</ul>
						<p className="mt-4 text-right text-sm font-semibold">
							Razem: {formatPrice(ret.totalToRefund)}
						</p>
					</div>
				</div>

				<div>
					<ReturnActions returnId={ret.id} currentStatus={ret.status} />
				</div>
			</div>
		</div>
	);
}
