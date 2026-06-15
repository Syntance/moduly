/** Status realizacji zamówienia w Medusa (cykl życia). */
export type OrderStatus =
	| "pending"
	| "completed"
	| "draft"
	| "archived"
	| "canceled"
	| "requires_action";

/** Status płatności w Medusa. */
export type OrderPaymentStatus =
	| "not_paid"
	| "awaiting"
	| "authorized"
	| "partially_authorized"
	| "captured"
	| "partially_captured"
	| "refunded"
	| "partially_refunded"
	| "canceled"
	| "requires_action";

/** Status wysyłki w Medusa. */
export type OrderFulfillmentStatus =
	| "not_fulfilled"
	| "partially_fulfilled"
	| "fulfilled"
	| "partially_shipped"
	| "shipped"
	| "partially_delivered"
	| "delivered"
	| "canceled";

export type OrderAddress = {
	firstName: string;
	lastName: string;
	company: string;
	address1: string;
	address2: string;
	city: string;
	postalCode: string;
	province: string;
	countryCode: string;
	phone: string;
};

export type OrderLineItem = {
	id: string;
	title: string;
	quantity: number;
	unitPrice: number;
	total: number;
	thumbnail: string | null;
	/** Pola tekstowe, pliki, kolory konfiguratora itd. z koszyka. */
	metadata: Record<string, string>;
};

export type OrderPayment = {
	id: string;
	amount: number;
	currencyCode: string;
	providerId: string | null;
	capturedAt: string | null;
	canceledAt: string | null;
};

export type OrderFulfillment = {
	id: string;
	shippedAt: string | null;
	deliveredAt: string | null;
	canceledAt: string | null;
	items: Array<{ id: string; quantity: number }>;
};

export type AdminOrderRow = {
	id: string;
	displayId: number;
	status: OrderStatus;
	paymentStatus: OrderPaymentStatus;
	fulfillmentStatus: OrderFulfillmentStatus;
	email: string;
	customerName: string;
	currencyCode: string;
	total: number;
	itemCount: number;
	createdAt: string;
	/** Realizacja express (+50% produktów) — z metadata zamówienia. */
	expressDelivery: boolean;
};

/** Agregaty zamówień na pulpicie „Przegląd”. Kwoty w groszach. */
export type AdminOrdersOverviewSummary = {
	orderCount: number;
	totalMinor: number;
	paidCount: number;
	paidTotalMinor: number;
	unpaidCount: number;
	unpaidTotalMinor: number;
	canceledCount: number;
	currencyCode: string;
};

export type AdminOrderDetail = {
	id: string;
	displayId: number;
	status: OrderStatus;
	paymentStatus: OrderPaymentStatus;
	fulfillmentStatus: OrderFulfillmentStatus;
	email: string;
	phone: string;
	currencyCode: string;
	createdAt: string;
	updatedAt: string;
	items: OrderLineItem[];
	itemTotal: number;
	shippingTotal: number;
	taxTotal: number;
	discountTotal: number;
	total: number;
	shippingAddress: OrderAddress | null;
	billingAddress: OrderAddress | null;
	shippingMethodName: string | null;
	payments: OrderPayment[];
	fulfillments: OrderFulfillment[];
	metadata: Record<string, string>;
};
