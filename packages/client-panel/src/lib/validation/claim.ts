import { z } from "zod";

export const CLAIM_REMEDIES = ["repair", "price_reduction", "withdrawal"] as const;

export type ClaimRemedyValue = (typeof CLAIM_REMEDIES)[number];

const IBAN_PL_REGEX = /^PL[\dA-Z]{26}$/i;

function normalizeIban(value: string): string {
	return value.replace(/\s+/g, "").toUpperCase();
}

export const CreateClaimSchema = z
	.object({
		orderId: z.string().min(1),
		itemIds: z
			.array(z.string())
			.min(1, "Wybierz produkt, którego dotyczy reklamacja."),
		description: z
			.string()
			.trim()
			.min(20, "Opis niezgodności — minimum 20 znaków.")
			.max(4000),
		remedy: z.enum(CLAIM_REMEDIES, { message: "Wybierz żądanie." }),
		bankAccount: z
			.string()
			.trim()
			.max(34)
			.optional()
			.transform((v) => v ?? ""),
	})
	.superRefine((data, ctx) => {
		const needsBank =
			data.remedy === "price_reduction" || data.remedy === "withdrawal";
		if (!needsBank) return;

		const iban = normalizeIban(data.bankAccount);
		if (!iban) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["bankAccount"],
				message: "Podaj numer rachunku do zwrotu (IBAN).",
			});
			return;
		}
		if (!IBAN_PL_REGEX.test(iban)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["bankAccount"],
				message: "Podaj polski IBAN (PL + 26 cyfr).",
			});
		}
	});

export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;
