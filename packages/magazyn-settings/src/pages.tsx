import { Bell, CreditCard, Globe, Key, Shield, Truck } from "lucide-react";
import { PageHeader } from "@moduly/ui";
import {
	buildApiSection,
	buildGeneralSection,
	buildNotificationsSection,
	buildPaymentsSection,
	buildSecuritySection,
	buildSetupChecklist,
	buildShippingSection,
	getEditableNotifications,
} from "./build-snapshot";
import { requireSettingsAdmin } from "./configure";
import { NotificationsEditor } from "./components/notifications-editor";
import { SettingsStatusView } from "./components/settings-status-view";
import { SetupChecklist } from "./components/setup-checklist";

export const dynamic = "force-dynamic";

export async function SettingsOgolnePage() {
	await requireSettingsAdmin();
	const [checklist, section] = await Promise.all([buildSetupChecklist(), buildGeneralSection()]);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Ustawienia sklepu"
				description="Status integracji i dane instancji — podłącz ENV, potem sprawdź checklistę."
			/>
			<SetupChecklist items={checklist} />
			<SettingsStatusView icon={Globe} section={section} />
		</div>
	);
}

export async function SettingsPlatnosciPage() {
	await requireSettingsAdmin();
	const section = await buildPaymentsSection();
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Płatności" description="Live status providerów z Medusa + ENV backendu." />
			<SettingsStatusView icon={CreditCard} section={section} />
		</div>
	);
}

export async function SettingsDostawaPage() {
	await requireSettingsAdmin();
	const section = await buildShippingSection();
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Dostawa" description="Metody wysyłki z Medusa Admin API." />
			<SettingsStatusView icon={Truck} section={section} />
		</div>
	);
}

export async function SettingsPowiadomieniaPage() {
	await requireSettingsAdmin();
	const [section, editable] = await Promise.all([
		buildNotificationsSection(),
		getEditableNotifications(),
	]);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Powiadomienia" description="Adresy zespołu dla zdarzeń operacyjnych." />
			<SettingsStatusView icon={Bell} section={section} />
			<NotificationsEditor initial={editable.emails} canEdit={editable.canEdit} />
		</div>
	);
}

export async function SettingsBezpieczenstwoPage() {
	await requireSettingsAdmin();
	const section = await buildSecuritySection();
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Bezpieczeństwo" description="Sesja panelu, allowlist i rate limiting." />
			<SettingsStatusView icon={Shield} section={section} />
		</div>
	);
}

export async function SettingsApiPage() {
	await requireSettingsAdmin();
	const section = await buildApiSection();
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="API & Webhooks" description="Revalidacja, deploy hook i storage mediów." />
			<SettingsStatusView icon={Key} section={section} />
		</div>
	);
}
