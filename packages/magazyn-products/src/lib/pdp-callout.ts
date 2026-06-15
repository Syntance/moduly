export const PDP_CALLOUT_META_KEY = "pdp_callout";
export const PDP_CALLOUT_ENABLED_META_KEY = "pdp_callout_enabled";

const LEGACY_STAND_CALLOUT_META_KEY = "stand_callout";

export function parsePdpCallout(
	meta: Record<string, unknown> | null | undefined,
): string {
	const raw = meta?.[PDP_CALLOUT_META_KEY] ?? meta?.[LEGACY_STAND_CALLOUT_META_KEY];
	return typeof raw === "string" ? raw.trim() : "";
}

export function parsePdpCalloutEnabled(
	meta: Record<string, unknown> | null | undefined,
): boolean {
	const raw = meta?.[PDP_CALLOUT_ENABLED_META_KEY];
	if (raw === "true") return true;
	if (raw === "false") return false;
	return parsePdpCallout(meta).length > 0;
}

export function serializePdpCalloutForMetadata(
	enabled: boolean,
	callout: string,
): Record<string, string> {
	return {
		[PDP_CALLOUT_ENABLED_META_KEY]: enabled ? "true" : "false",
		[PDP_CALLOUT_META_KEY]: callout.trim(),
	};
}
