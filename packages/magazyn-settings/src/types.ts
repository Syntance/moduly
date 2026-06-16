export type SettingsFieldStatus = "ok" | "warning" | "missing" | "info";

export type SettingsStatusField = {
	label: string;
	val: string;
	status?: SettingsFieldStatus;
	hint?: string;
};

export type SettingsStatusSection = {
	id: string;
	tytul: string;
	opis: string;
	pola: SettingsStatusField[];
};

export type SetupCheckItem = {
	id: string;
	label: string;
	status: SettingsFieldStatus;
	detail: string;
};

export type PaymentProviderStatus = {
	id: string;
	label: string;
	registeredInMedusa: boolean;
	envConfigured: boolean;
	regionLinked: boolean;
	sandbox?: boolean;
	detail: string;
};

export type ShippingOptionStatus = {
	id: string;
	name: string;
	regionName: string;
	priceLabel: string;
	providerLabel: string;
};
