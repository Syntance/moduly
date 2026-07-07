import { getModulyConfig } from "@moduly/magazyn-core/config";

export type SalesPeriodPreset = "miesiac" | "rok" | "wszystko" | "miesiac-wybor" | "zakres";

export type SalesPeriod = {
	preset: SalesPeriodPreset;
	rangeStart: Date;
	rangeEnd: Date;
	rangeLabel: string;
	/** YYYY-MM — tylko dla `miesiac-wybor`. */
	monthKey?: string;
	/** Rok kalendarzowy — tylko dla `rok`. */
	year?: number;
};

export type SalesPeriodSearchParams = {
	okres?: string;
	rok?: string;
	miesiac?: string;
	od?: string;
	do?: string;
};

const ALL_TIME_START = new Date(2020, 0, 1);

function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function endOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(23, 59, 59, 999);
	return copy;
}

function parseIsoDate(value: string | undefined): Date | null {
	if (!value?.trim()) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}
	return date;
}

function parseMonthKey(value: string | undefined): string | null {
	if (!value?.trim()) return null;
	const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	if (month < 1 || month > 12) return null;
	return `${year}-${String(month).padStart(2, "0")}`;
}

function parseYear(value: string | undefined, now = new Date()): number | null {
	if (!value?.trim()) return null;
	const match = /^(\d{4})$/.exec(value.trim());
	if (!match) return null;
	const year = Number(match[1]);
	if (year < 2020 || year > now.getFullYear()) return null;
	return year;
}

function monthLabel(monthKey: string, withYear = true): string {
	const [year, month] = monthKey.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	return date.toLocaleDateString(getModulyConfig().commerce.locale, {
		month: "long",
		...(withYear ? { year: "numeric" } : {}),
	});
}

function formatShortDate(date: Date): string {
	return date.toLocaleDateString(getModulyConfig().commerce.locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function rangeFromMonthKey(monthKey: string): SalesPeriod {
	const [yearRaw, monthRaw] = monthKey.split("-");
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const rangeStart = startOfDay(new Date(year, month - 1, 1));
	const rangeEnd = endOfDay(new Date(year, month, 0));
	const now = new Date();
	const cappedEnd = rangeEnd > now ? endOfDay(now) : rangeEnd;
	return {
		preset: "miesiac-wybor",
		rangeStart,
		rangeEnd: cappedEnd,
		rangeLabel: monthLabel(monthKey),
		monthKey,
	};
}

function rangeFromYear(year: number, now = new Date()): SalesPeriod {
	const rangeStart = startOfDay(new Date(year, 0, 1));
	const yearEnd = endOfDay(new Date(year, 11, 31));
	const rangeEnd = yearEnd > endOfDay(now) ? endOfDay(now) : yearEnd;
	return {
		preset: "rok",
		rangeStart,
		rangeEnd,
		rangeLabel: String(year),
		year,
	};
}

/** Domyślny okres pulpitu — ostatnie 6 miesięcy kalendarzowych. */
export function getOverviewSalesPeriod(now = new Date()): SalesPeriod {
	const rangeEnd = endOfDay(now);
	const rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 5, 1));
	return {
		preset: "zakres",
		rangeStart,
		rangeEnd,
		rangeLabel: `${rangeStart.toLocaleDateString(getModulyConfig().commerce.locale, { month: "short" })} – ${rangeEnd.toLocaleDateString(getModulyConfig().commerce.locale, { month: "short", year: "numeric" })}`,
	};
}

export function parseSalesPeriod(
	params: SalesPeriodSearchParams,
	now = new Date(),
): SalesPeriod {
	const preset = params.okres as SalesPeriodPreset | undefined;

	if (preset === "wszystko") {
		return {
			preset: "wszystko",
			rangeStart: startOfDay(ALL_TIME_START),
			rangeEnd: endOfDay(now),
			rangeLabel: "Od początku",
		};
	}

	if (preset === "rok") {
		const year = parseYear(params.rok, now) ?? now.getFullYear();
		return rangeFromYear(year, now);
	}

	if (preset === "miesiac-wybor") {
		const monthKey = parseMonthKey(params.miesiac) ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
		return rangeFromMonthKey(monthKey);
	}

	if (preset === "zakres") {
		const from =
			parseIsoDate(params.od) ?? startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
		const to = parseIsoDate(params.do) ?? endOfDay(now);
		if (from <= to) {
			const cappedTo = to > endOfDay(now) ? endOfDay(now) : to;
			return {
				preset: "zakres",
				rangeStart: startOfDay(from),
				rangeEnd: endOfDay(cappedTo),
				rangeLabel: `${formatShortDate(from)} – ${formatShortDate(cappedTo)}`,
			};
		}
	}

	if (preset === "miesiac" || !preset) {
		const rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
		return {
			preset: "miesiac",
			rangeStart,
			rangeEnd: endOfDay(now),
			rangeLabel: monthLabel(
				`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
			),
		};
	}

	// Nieznany preset — bieżący miesiąc
	const rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
	return {
		preset: "miesiac",
		rangeStart,
		rangeEnd: endOfDay(now),
		rangeLabel: monthLabel(
			`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
		),
	};
}

export function salesPeriodToRangeDays(period: SalesPeriod): number {
	const ms = period.rangeEnd.getTime() - period.rangeStart.getTime();
	const days = Math.ceil(ms / 86_400_000) + 1;
	return Math.min(365, Math.max(1, days));
}

/** Zakres kalendarzowy okresu statystyk (YYYY-MM-DD) — do zapytań GA4/PostHog/raw-hits. */
export function salesPeriodToIsoRange(period: SalesPeriod): { from: string; to: string } {
	const toIso = (date: Date) => {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	};
	return { from: toIso(period.rangeStart), to: toIso(period.rangeEnd) };
}

export function buildYearPickerOptions(now = new Date()): Array<{ value: string; label: string }> {
	const options: Array<{ value: string; label: string }> = [];
	for (let year = now.getFullYear(); year >= 2020; year -= 1) {
		options.push({ value: String(year), label: String(year) });
	}
	return options;
}

export function buildMonthPickerOptions(count = 24, now = new Date()): Array<{ value: string; label: string }> {
	const options: Array<{ value: string; label: string }> = [];
	for (let i = 0; i < count; i += 1) {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		options.push({ value, label: monthLabel(value) });
	}
	return options;
}

export function toPeriodSearchParams(period: {
	preset: SalesPeriodPreset;
	year?: number;
	monthKey?: string;
	from?: string;
	to?: string;
}): URLSearchParams {
	const params = new URLSearchParams();
	params.set("okres", period.preset);
	if (period.preset === "rok" && period.year) {
		params.set("rok", String(period.year));
	}
	if (period.preset === "miesiac-wybor" && period.monthKey) {
		params.set("miesiac", period.monthKey);
	}
	if (period.preset === "zakres" && period.from && period.to) {
		params.set("od", period.from);
		params.set("do", period.to);
	}
	return params;
}
