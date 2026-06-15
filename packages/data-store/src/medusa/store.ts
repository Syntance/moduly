import type {

	AdminReturnRow,

	AuditEntry,

	ContactFormsConfig,

	ContactSubmission,

	ContentPageId,

	CreateContactSubmissionInput,

	CreateFormSubmissionInput,

	CreateReturnInput,

	DataStore,

	FormSubmission,

	GlobalContent,

	ListContactSubmissionsOptions,

	ListReturnsOptions,

	ListSubmissionsOptions,

	PageContent,

	ReturnRequest,

	ReturnStatus,

	SeoMeta,

	SiteSettings,

	UpdateReturnStatusExtra,

} from "@moduly/types";



const STUB_MESSAGE = "use Medusa module services";



function notImplemented(): never {

	throw new Error(STUB_MESSAGE);

}



export type MedusaStoreConfig = {

	backendUrl: string;

	serviceToken?: string;

};



/** Stub `DataStore` delegujący do custom API routes Medusy. */

export class MedusaStore implements DataStore {

	constructor(private readonly _config: MedusaStoreConfig) {}



	getSiteSettings(): Promise<SiteSettings> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	saveSiteSettings(_settings: SiteSettings): Promise<void> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getPageContent(_pageId: ContentPageId): Promise<PageContent | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	savePageContent(

		_pageId: ContentPageId,

		_content: PageContent,

	): Promise<void> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getPageSeo(_pageId: ContentPageId): Promise<SeoMeta | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	savePageSeo(_pageId: ContentPageId, _seo: SeoMeta): Promise<void> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getGlobalContent(): Promise<GlobalContent> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	saveGlobalContent(_content: GlobalContent): Promise<void> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getFormsConfig(): Promise<ContactFormsConfig> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	saveFormsConfig(_config: ContactFormsConfig): Promise<void> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	listContactSubmissions(

		_options?: ListContactSubmissionsOptions,

	): Promise<ContactSubmission[]> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	createContactSubmission(

		_input: CreateContactSubmissionInput,

	): Promise<ContactSubmission> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getContactSubmission(_submissionId: string): Promise<ContactSubmission | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	listContactSubmissionsForEmail(_email: string): Promise<ContactSubmission[]> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	allocateContactCaseNumber(_prefix: string): Promise<string> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	listSubmissions(

		_formId: string,

		_options?: ListSubmissionsOptions,

	): Promise<FormSubmission[]> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	createSubmission(_input: CreateFormSubmissionInput): Promise<FormSubmission> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getSubmission(_submissionId: string): Promise<FormSubmission | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	listReturns(_options?: ListReturnsOptions): Promise<AdminReturnRow[]> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getReturn(_returnId: string): Promise<ReturnRequest | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	createReturn(_input: CreateReturnInput): Promise<ReturnRequest> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	updateReturnStatus(

		_returnId: string,

		_status: ReturnStatus,

		_extra?: UpdateReturnStatusExtra,

	): Promise<ReturnRequest> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getReturnsByCustomerEmail(_email: string): Promise<ReturnRequest[]> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getActiveClaimForOrder(

		_customerEmail: string,

		_orderId: string,

	): Promise<ReturnRequest | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	getActiveWithdrawalForOrder(

		_customerEmail: string,

		_orderId: string,

	): Promise<ReturnRequest | undefined> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}



	recordAudit(_entry: AuditEntry): Promise<void> {

		return Promise.reject(new Error(STUB_MESSAGE));

	}

}



export { STUB_MESSAGE as MEDUSA_STORE_STUB_MESSAGE };



export function assertMedusaModuleService(): never {

	notImplemented();

}


