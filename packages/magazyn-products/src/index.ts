/** Publiczne API modułu produktów (bez konfiguratora kolorów / podstawki / pól tekstowych). */
export { default as ProductsPage, dynamic as productsPageDynamic } from "./page";
export { default as NewProductPage } from "./new-product-page";
export { default as EditProductPage } from "./edit-product-page";
export { ProductForm } from "./product-form";
export { ProductsList } from "./products-list";
export { DeleteProductButton } from "./delete-product-button";
export { DuplicateProductButton } from "./duplicate-product-button";
export {
	listAdminProducts,
	getAdminProduct,
	listCategoryOptions,
	createAdminProduct,
	updateAdminProduct,
	deleteAdminProduct,
	duplicateAdminProduct,
	type AdminProductRow,
	type AdminProductDetail,
	type ProductFormValues,
	type CategoryOption,
} from "./store";
export {
	saveProductAction,
	deleteProductAction,
	duplicateProductAction,
	uploadImagesAction,
} from "./actions";
