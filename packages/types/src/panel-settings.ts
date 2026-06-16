/** Adresy powiadomień operacyjnych panelu — nadpisują domyślny contactEmail z configu. */
export type PanelNotificationSettings = {
	orderEmail?: string;
	lowStockEmail?: string;
	formEmail?: string;
	returnsEmail?: string;
};

/** Ustawienia panelu zapisywane w metadata sklepu (Medusa) lub Postgres. */
export type PanelSettings = {
	notifications?: PanelNotificationSettings;
};
