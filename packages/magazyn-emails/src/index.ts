export {
	saveTemplateAction,
	resetTemplateAction,
	setTemplateEnabledAction,
	sendTestEmailAction,
	uploadEmailImageAction,
	type EmailActionState,
	type ResetActionState,
	type ToggleEnabledActionState,
	type UploadActionState,
} from "./actions";

export { BLOCK_META, PALETTE_BLOCKS, createBlock, duplicateBlock } from "./block-meta";
export {
	buildContactEmailRenderVars,
	createContactCaseNumber,
	type ContactEmailPayload,
	type ContactEmailRenderVars,
} from "./contact-email-context";
export { sendContactConfirmationEmail } from "./send-contact-confirmation";
export {
	sendContactNotificationEmail,
	type SendContactNotificationResult,
} from "./send-contact-notification";
export { sendTransactionalEmail, type SendEmailInput, type SendEmailResult } from "./send-transactional";
export { sendOrderStageEmail } from "./send-order-email";
export { sendShopOrderNotificationEmail } from "./send-shop-order-notification";
export { sendBankTransferPendingEmail } from "./send-bank-transfer-email";
export { sendPaymentFailedEmail } from "./send-payment-failed-email";
export {
	getAllEmailTemplates,
	getEmailTemplateForSend,
	isEmailTemplateEnabledForSend,
	resetEmailTemplate,
	saveEmailTemplate,
	setEmailTemplateEnabled,
} from "./store";
export * from "./template-types";
export {
	buildOrderRenderContext,
	mergeSubject,
	renderTemplate,
	sampleRenderContext,
	sampleRenderContextForTemplate,
	type EmailRenderContext,
	type RenderedEmail,
} from "./render-template";

export {
	EMAIL_CONTACT,
	buildCaseRenderVarsForNewWithdrawal,
	buildCustomerCaseEmailBodies,
	sendReturnStatusCustomerEmail,
	sendCaseCustomerEmail,
	type CaseEmailVars,
} from "./case-email";

export { default as EmailsPage } from "./page";
