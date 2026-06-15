import { z } from "zod";

export const CustomerLoginSchema = z.object({
	email: z.string().email("Podaj poprawny adres e-mail"),
});

export const CustomerVerifyOtpSchema = z.object({
	email: z.string().email(),
	code: z
		.string()
		.length(6, "Kod musi mieć 6 cyfr")
		.regex(/^\d{6}$/, "Kod składa się tylko z cyfr"),
});

export const CreateReturnSchema = z.object({
	orderId: z.string().min(1),
	itemIds: z.array(z.string()).min(1, "Wybierz produkt, którego dotyczy odstąpienie."),
	reason: z.string().min(10, "Podaj powód zwrotu (min. 10 znaków)").max(500),
});

export type CustomerLoginInput = z.infer<typeof CustomerLoginSchema>;
export type CustomerVerifyOtpInput = z.infer<typeof CustomerVerifyOtpSchema>;
export type CreateReturnInput = z.infer<typeof CreateReturnSchema>;
