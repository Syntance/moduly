"use server";

import { redirect } from "next/navigation";
import { isAdminEmailAllowed } from "@moduly/auth-core";
import {
	AdminApiError,
	AdminUnauthorizedError,
	loginWithEmailPassword,
	setSessionToken,
	clearSessionToken,
} from "@moduly/magazyn-core";
import { modulyConfig } from "@/moduly.config";

export type LoginState = { error: string | null };

export async function loginEmailAction(
	_prev: LoginState,
	formData: FormData,
): Promise<LoginState> {
	const email = String(formData.get("email") ?? "").trim();
	const password = String(formData.get("password") ?? "");

	if (!email || !password) {
		return { error: "Podaj email i hasło." };
	}

	if (!isAdminEmailAllowed(email)) {
		return { error: "To konto nie ma dostępu do panelu." };
	}

	try {
		const token = await loginWithEmailPassword(email, password);
		await setSessionToken(token);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) return { error: error.message };
		if (error instanceof AdminApiError) return { error: error.message };
		return { error: "Nie udało się połączyć z serwerem. Spróbuj ponownie." };
	}

	redirect(`${modulyConfig.basePath}/panel`);
}

export async function logoutAction(): Promise<void> {
	await clearSessionToken();
	redirect(modulyConfig.basePath);
}
