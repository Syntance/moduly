/**
 * Pola koszyka zwracane z custom Store API — bez `region.*` z defaultStoreCartFields,
 * które wywala remoteQuery („Entity 'Cart' does not have property 'region'”).
 * Zgodne z `CART_FIELDS_QUERY` w storefront.
 */
export const STORE_CART_REMOTE_QUERY_FIELDS = [
	"id",
	"currency_code",
	"subtotal",
	"total",
	"tax_total",
	"shipping_total",
	"discount_total",
	"items.id",
	"items.variant_id",
	"items.title",
	"items.quantity",
	"items.unit_price",
	"items.subtotal",
	"items.total",
	"items.thumbnail",
	"items.metadata",
	"shipping_methods.id",
	"shipping_methods.name",
	"shipping_methods.amount",
	"shipping_methods.shipping_option_id",
	"promotions.id",
	"promotions.code",
	"metadata",
];
