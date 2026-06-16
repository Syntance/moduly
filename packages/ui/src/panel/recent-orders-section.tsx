import Link from "next/link";
import { Badge, Section, TBody, Td, THead, Th, Table } from "./chrome";
import { formatKwota, statusZamowienia, zamowieniaDemo } from "./demo-data";

export type RecentOrdersSectionProps = {
	ordersBasePath: string;
};

export function RecentOrdersSection({ ordersBasePath }: RecentOrdersSectionProps) {
	return (
		<Section
			title="Ostatnie zamówienia"
			action={
				<Link
					href={ordersBasePath}
					className="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					Zobacz wszystkie →
				</Link>
			}
		>
			<Table>
				<THead>
					<tr>
						{["Zamówienie", "Klient", "Miasto", "Wartość", "Status"].map((h) => (
							<Th key={h}>{h}</Th>
						))}
					</tr>
				</THead>
				<TBody>
					{zamowieniaDemo.map((z) => {
						const s = statusZamowienia[z.status];
						return (
							<tr key={z.id} className="transition-colors hover:bg-muted/30">
								<Td className="px-4 py-3">
									<Link
										href={`${ordersBasePath}/${z.id}`}
										className="block text-sm font-semibold text-foreground hover:text-primary"
									>
										#{z.id}
									</Link>
									<span className="block text-xs text-muted-foreground">{z.data}</span>
								</Td>
								<Td className="px-4 py-3">
									<span className="block text-sm font-medium text-foreground">{z.klient}</span>
									<span className="block text-xs text-muted-foreground">{z.email}</span>
								</Td>
								<Td className="text-muted-foreground">{z.miasto}</Td>
								<Td className="font-medium text-foreground">{formatKwota(z.kwota)}</Td>
								<Td>
									<Badge tone={s.tone}>{s.label}</Badge>
								</Td>
							</tr>
						);
					})}
				</TBody>
			</Table>
		</Section>
	);
}
