import { defaultModulyConfig } from "@moduly/config";
import {
	CustomerOtpAuth,
	createMemoryCustomerOtpStore,
	type CustomerOtpAuth as CustomerOtpAuthType,
} from "@moduly/auth-core";

export type ClientPanelConfig = {
	basePath: string;
	brandName: string;
	siteUrl: string;
	contactEmail: string;
	customerCookieName: string;
	jwtSecret: string;
	paths: {
		account: string;
		claims: string;
		withdrawal: string;
	};
};

let config: ClientPanelConfig = {
	basePath: defaultModulyConfig.basePath,
	brandName: defaultModulyConfig.branding.name,
	siteUrl: defaultModulyConfig.email.siteUrl,
	contactEmail: defaultModulyConfig.email.contactEmail,
	customerCookieName: "customer_session",
	jwtSecret: process.env.CUSTOMER_JWT_SECRET ?? "dev-customer-secret-change-me",
	paths: {
		account: "/konto",
		claims: "/konto/reklamacje",
		withdrawal: "/konto/odstapienie",
	},
};

let customerAuth: CustomerOtpAuthType | null = null;

export function configureClientPanel(next: Partial<ClientPanelConfig>): void {
	config = { ...config, ...next, paths: { ...config.paths, ...next.paths } };
	customerAuth = new CustomerOtpAuth(
		{
			jwtSecret: config.jwtSecret,
			cookieName: config.customerCookieName,
		},
		createMemoryCustomerOtpStore(),
	);
}

export function getClientPanelConfig(): ClientPanelConfig {
	return config;
}

export function getCustomerOtpAuth(): CustomerOtpAuthType {
	if (!customerAuth) {
		configureClientPanel({});
	}
	return customerAuth!;
}
