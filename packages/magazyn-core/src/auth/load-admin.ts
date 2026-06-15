import "server-only";
import { redirect } from "next/navigation";
import { getModulyConfig } from "../configure";
import { AdminUnauthorizedError } from "../medusa/errors";

/**
 * Wrapper do pobierania danych w Server Components.
 * Wygasła sesja → przekierowanie na ekran logowania.
 */
export async function loadAdmin<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) {
			redirect(`${getModulyConfig().basePath}/login`);
		}
		throw error;
	}
}
