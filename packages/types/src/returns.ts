/** Odstąpienie (14 dni) lub reklamacja (zgodność z umową). */
export type ReturnRequestType = "withdrawal" | "claim";

export type ClaimRemedy = "repair" | "price_reduction" | "withdrawal";

/** Status wniosku o zwrot/odstąpienie od umowy (14 dni UPK art. 27). */
export type ReturnStatus =
	| "pending_approval"
	| "approved"
	| "shipped"
	| "received"
	| "refunded"
	| "rejected"
	| "canceled";

export type ReturnLineItem = {
	orderLineItemId: string;
	productTitle: string;
	quantity: number;
	/** Cena jednostkowa w groszach. */
	unitPrice: number;
	thumbnail: string | null;
};

/** Wniosek o zwrot — pełne dane. */
export type ReturnRequest = {
	id: string;
	requestType: ReturnRequestType;
	orderId: string;
	orderDisplayId: number;
	customerEmail: string;
	status: ReturnStatus;
	reason: string;
	claimRemedy: ClaimRemedy | null;
	claimReferenceId: string | null;
	items: ReturnLineItem[];
	totalToRefund: number;
	createdAt: string;
	updatedAt: string;
	approvedAt: string | null;
	shippedAt: string | null;
	receivedAt: string | null;
	refundedAt: string | null;
	rejectedAt: string | null;
	rejectionReason: string | null;
	adminNotes: string | null;
};

/** Wiersz listy zwrotów w panelu magazynu. */
export type AdminReturnRow = {
	id: string;
	requestType: ReturnRequestType;
	orderDisplayId: number;
	customerEmail: string;
	status: ReturnStatus;
	totalToRefund: number;
	itemCount: number;
	createdAt: string;
};

export type CreateReturnInput = {
	requestType: ReturnRequestType;
	orderId: string;
	orderDisplayId: number;
	customerEmail: string;
	items: ReturnLineItem[];
	reason: string;
	totalToRefund: number;
	claimRemedy?: ClaimRemedy | null;
	claimReferenceId?: string | null;
};

export type UpdateReturnStatusExtra = {
	rejectionReason?: string;
	adminNotes?: string;
};

export type ListReturnsOptions = {
	limit?: number;
	offset?: number;
	status?: ReturnStatus;
};

/** Aktywne statusy blokujące równoległe odstąpienie/reklamację. */
export const ACTIVE_RETURN_STATUSES: readonly ReturnStatus[] = [
	"pending_approval",
	"approved",
	"shipped",
	"received",
];
