import { analyticsConfig, enabled } from "../config";

declare global {
	interface Window {
		clarity?: (...args: unknown[]) => void;
	}
}

let clarityInitialized = false;

export function ensureClarity(): void {
	if (typeof window === "undefined" || clarityInitialized || !enabled.clarity()) return;
	const id = analyticsConfig.clarityId;
	if (!id) return;

	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.clarity.ms/tag/${id}`;
	document.head.appendChild(script);

	clarityInitialized = true;
}

export function sendClarityEvent(_name: string, _payload: Record<string, unknown>): void {
	if (!enabled.clarity()) return;
	ensureClarity();
	window.clarity?.("event", _name);
}
