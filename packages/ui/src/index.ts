// Primitives
export { Button, type ButtonProps } from "./primitives/button";
export { Input } from "./primitives/input";
export { CheckboxInput } from "./primitives/checkbox";
export { Switch } from "./primitives/switch";
export { ConfirmDialog } from "./primitives/confirm-dialog";

// Panel chrome (layout 1:1 z moduly-demo)
export {
	PageHeader,
	Card,
	ModuleTile,
	Badge,
	StatusBadge,
	BADGE_TONE,
	type BadgeTone,
	Table,
	THead,
	Th,
	TBody,
	Td,
	StatTile,
	Section,
} from "./panel/chrome";
export { SettingsSectionView, type SettingsField, type SettingsSectionData } from "./layout/settings-section-view";
export {
	settingsOgolne,
	settingsPlatnosci,
	settingsDostawa,
	settingsPowiadomienia,
	settingsBezpieczenstwo,
	settingsApi,
} from "./layout/settings-demo-data";
export { DashboardCharts } from "./panel/dashboard-charts";
export { RecentOrdersSection, type RecentOrdersSectionProps } from "./panel/recent-orders-section";
export { StatisticsView } from "./panel/statistics-view";
export {
	formatKwota,
	panelStats,
	przychodyMiesieczne,
	zamowieniaDemo,
	statusZamowienia,
	moduleBadgeFromHref,
} from "./panel/demo-data";

// Layout
export { PanelShell, type PanelShellProps } from "./layout/panel-shell";
export { PanelSidebarNav, type PanelSidebarNavProps } from "./layout/panel-sidebar-nav";
export { SidebarNav, type SidebarNavProps } from "./layout/sidebar-nav";
export { SidebarFooter, type SidebarFooterProps } from "./layout/sidebar-footer";
export { SettingsSidebarNav, type SettingsSidebarNavProps } from "./layout/settings-sidebar-nav";
export { OverviewPage, type OverviewPageProps } from "./layout/overview-page";
export { buildNavItems } from "./layout/nav-items";
export { buildSettingsNavItems, isSettingsPath } from "./layout/settings-nav-items";
export type {
	ModulesToggle,
	PanelBranding,
	PanelConfig,
	NavItem,
	SettingsNavItem,
} from "./layout/types";

// Utils
export { cn } from "./lib/cn";
