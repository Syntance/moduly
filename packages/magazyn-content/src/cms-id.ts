/** Generuje stabilne ID dla nowych wpisów CMS (bez "use server"). */
export function newCmsId(prefix: string): string {
	return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}
