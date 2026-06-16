import { EVENT_REGISTRY, type EventKey } from "@syntance/analytics-events";
import { analyticsConfig, enabled } from "../config";

declare global {
	interface Window {
		fbq?: FbqFunction;
		_fbq?: FbqFunction;
	}
}

type FbqFunction = ((...args: unknown[]) => void) & {
	queue?: unknown[];
	loaded?: boolean;
	version?: string;
	callMethod?: (...args: unknown[]) => void;
};

let metaInitialized = false;

function ensureMetaPixel(): void {
	if (typeof window === "undefined" || metaInitialized || !enabled.meta()) return;

	const id = analyticsConfig.metaPixelId;
	if (!id) return;

	if (!window.fbq) {
		const fbq: FbqFunction = (...args: unknown[]) => {
			fbq.queue?.push(args);
		};
		fbq.queue = [];
		fbq.loaded = true;
		fbq.version = "2.0";
		window.fbq = fbq;
		window._fbq = fbq;

		const script = document.createElement("script");
		script.async = true;
		script.src = "https://connect.facebook.net/en_US/fbevents.js";
		document.head.appendChild(script);
	}

	window.fbq?.("init", id);
	metaInitialized = true;
}

export function sendMetaEvent(name: EventKey, payload: Record<string, unknown>): void {
	const entry = EVENT_REGISTRY[name];
	if (!entry.meta || !enabled.meta()) return;

	ensureMetaPixel();
	window.fbq?.("track", entry.meta, payload);
}
