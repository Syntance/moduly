import Link from "next/link";
import { PackageX } from "lucide-react";
import { formatPrice } from "@moduly/magazyn-core";
import { getMagazynReturnsConfig } from "./configure";
import { getReturnsListAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
	pending_approval: "Oczekuje na akceptację",
	approved: "Zaakceptowany",
	shipped: "Wysłany",
	received: "Otrzymany",
	refunded: "Zwrócono środki",
	rejected: "Odrzucony",
	canceled: "Anulowany",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
	claim: "Reklamacja",
	withdrawal: "Odstąpienie",
};

export default async function ZwrotyPage() {
	const result = await getReturnsListAction();
	const basePath = getMagazynReturnsConfig().basePath;

	if (!result.ok) {
		return (
			<div className="space-y-6">
				<h1 className="font-serif text-2xl text-foreground">Zwroty</h1>
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
					{result.error}
				</div>
			</div>
		);
	}

	const returns = result.returns;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="font-serif text-2xl text-foreground">Zwroty i reklamacje</h1>
				<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
					{returns.length}
				</span>
			</div>

			{returns.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
					<PackageX className="mb-4 size-12 text-muted-foreground" />
					<p className="text-sm font-medium text-foreground">Brak wniosków</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Zwroty i reklamacje pojawią się tutaj po złożeniu przez klienta
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-border bg-card">
					<table className="w-full">
						<thead className="border-b border-border bg-muted/50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Typ
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Zamówienie
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									E-mail
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Status
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Kwota
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Data
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Akcje
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{returns.map((ret) => (
								<tr key={ret.id} className="transition-colors hover:bg-muted/30">
									<td className="px-4 py-3 text-sm">
										{REQUEST_TYPE_LABELS[ret.requestType] ?? ret.requestType}
									</td>
									<td className="px-4 py-3 font-mono text-sm">#{ret.orderDisplayId}</td>
									<td className="px-4 py-3 text-sm">{ret.customerEmail}</td>
									<td className="px-4 py-3 text-sm">
										{STATUS_LABELS[ret.status] ?? ret.status}
									</td>
									<td className="px-4 py-3 text-right text-sm">
										{formatPrice(ret.totalToRefund)}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{new Date(ret.createdAt).toLocaleDateString("pl-PL")}
									</td>
									<td className="px-4 py-3 text-right">
										<Link
											href={`${basePath}/zwroty/${ret.id}`}
											className="text-sm font-medium text-primary hover:underline"
										>
											Szczegóły →
										</Link>
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
