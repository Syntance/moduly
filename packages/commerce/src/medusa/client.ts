import Medusa from "@medusajs/js-sdk";
import { resolveMedusaFetchBase } from "./resolve-fetch-base";

const PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim() ||
	process.env.MEDUSA_PUBLISHABLE_KEY?.trim() ||
	"";

export const medusa = new Medusa({
	baseUrl: resolveMedusaFetchBase(),
	publishableKey: PUBLISHABLE_KEY,
});
