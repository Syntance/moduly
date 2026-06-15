/** Aktywna sesja administratora panelu Moduly. */
export type AuthSession = {
	email: string;
	/** Czas wygaśnięcia sesji (epoch ms). */
	expiresAt: number;
};

/** Abstrakcja warstwy uwierzytelniania — implementacje: Medusa, Postgres. */
export interface AuthProvider {
	authenticate(email: string, password: string): Promise<AuthSession | null>;
	validateSession(token: string): Promise<AuthSession | null>;
	logout(token: string): Promise<void>;
	getSessionEmail(token: string): Promise<string | null>;
}
