import type { ReactNode } from "react";
import { ModuleTile, Section, StatTile } from "../panel/chrome";
import { DashboardCharts } from "../panel/dashboard-charts";
import { formatKwota, moduleBadgeFromHref, panelStats } from "../panel/demo-data";
import { RecentOrdersSection } from "../panel/recent-orders-section";
import { buildNavItems } from "./nav-items";
import type { PanelConfig } from "./types";

export type OverviewPageProps = {
	config: PanelConfig;
	/**
	 * WYŁĄCZNIE dla panel-demo (screenshoty/briefy): pokazuje FIKCYJNE KPI,
	 * wykresy, zamówienia i liczniki na kaflach. Domyślnie false — realne
	 * aplikacje pokazują tylko kafle modułów albo własne `summary`
	 * (sklep: komponenty Overview* z @moduly/magazyn-analytics).
	 */
	demo?: boolean;
	/** Opcjonalna sekcja nad kafelkami (zastępuje domyślne KPI). */
	summary?: ReactNode;
};

/**
 * Pulpit panelu — układ 1:1 z moduly-demo: KPI, kafle modułów, wykres, ostatnie zamówienia.
 */
export function OverviewPage({ config, demo = false, summary }: OverviewPageProps) {
	const panel = `${config.basePath}/panel`;
	const tiles = buildNavItems(config).filter((item) => item.href !== panel);
	const ordersPath = config.modules.orders ? `${panel}/zamowienia` : panel;

	return (
		<div className="flex flex-col gap-8">
			<header>
				<h1 className="font-serif text-2xl text-foreground">Przegląd</h1>
				<p className="mt-1 text-sm text-muted-foreground">Wybierz moduł, którym chcesz zarządzać.</p>
			</header>

			{summary ?? (!demo ? null : (
				<Section title="Podsumowanie (czerwiec 2026)">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatTile
							label="Przychód"
							value={formatKwota(panelStats.przychod)}
							trend={{ val: "18.4%", up: true }}
							sub="vs. maj"
						/>
						<StatTile
							label="Zamówienia"
							value={panelStats.zamowienia.toLocaleString("pl-PL")}
							trend={{ val: "9.2%", up: true }}
							sub="1 691 w maju"
						/>
						<StatTile
							label="Klienci"
							value={panelStats.klienci.toLocaleString("pl-PL")}
							trend={{ val: "5.1%", up: true }}
							sub="+158 nowych"
						/>
						<StatTile
							label="Śr. wartość koszyka"
							value={formatKwota(panelStats.srednia)}
							trend={{ val: "3.1%", up: true }}
						/>
					</div>
				</Section>
			))}

			<Section title="Moduły panelu">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tiles.map(({ href, label, icon: Icon }) => (
						<ModuleTile
							key={href}
							href={href}
							label={label}
							icon={<Icon className="size-5" aria-hidden />}
							badge={demo ? moduleBadgeFromHref(href) : undefined}
						/>
					))}
				</div>
			</Section>

			{!demo ? null : (
				<>
					<DashboardCharts />
					{config.modules.orders ? (
						<RecentOrdersSection ordersBasePath={ordersPath} />
					) : null}
				</>
			)}
		</div>
	);
}
