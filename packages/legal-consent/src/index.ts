export {
	CONSENT_EVENT,
	CONSENT_OPEN_EVENT,
	CONSENT_VERSION,
	getConsent,
	hasConsentDecision,
	isAnalyticsEnabled,
	isMarketingEnabled,
	openConsentBanner,
	saveConsent,
	type ConsentCategory,
	type ConsentState,
	type ConsentStorageOptions,
} from "./consent";

export {
	ConsentProvider,
	useConsent,
	useConsentOpenListener,
	type ConsentProviderConfig,
} from "./ConsentProvider";

export { CookieConsent } from "./CookieConsent";
export { FooterCookieSettings } from "./FooterCookieSettings";
export {
	LegalPageTemplate,
	type LegalBreadcrumb,
	type LegalPageTemplateProps,
} from "./LegalPageTemplate";

export {
	RegulaminTemplate,
	regulaminIntro,
	type LegalTemplateConfig,
} from "./templates/regulamin";

export {
	PolitykaPrywatnosciTemplate,
	politykaPrywatnosciIntro,
} from "./templates/polityka-prywatnosci";

export { ZwrotyTemplate, zwrotyIntro } from "./templates/zwroty";
