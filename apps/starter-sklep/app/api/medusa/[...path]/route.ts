import { type NextRequest, NextResponse } from "next/server";
import { resolveMedusaBackendUrl } from "@moduly/commerce";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailers",
	"transfer-encoding",
	"upgrade",
	"host",
	"content-length",
]);

const STRIP_RESPONSE_HEADERS = new Set([...HOP_BY_HOP, "content-encoding"]);

const ALLOWED_FIRST_SEGMENT = new Set(["store", "auth", "custom"]);
const UPSTREAM_TIMEOUT_MS = 55_000;

function filterResponseHeaders(upstream: Headers): Headers {
	const out = new Headers();
	upstream.forEach((value, key) => {
		if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
			out.set(key, value);
		}
	});
	return out;
}

function filterRequestHeaders(req: NextRequest): Headers {
	const h = new Headers();
	req.headers.forEach((value, key) => {
		if (!HOP_BY_HOP.has(key.toLowerCase())) {
			h.set(key, value);
		}
	});
	return h;
}

function ensureStorePublishableKey(headers: Headers, path: string): void {
	if (!path.startsWith("store/")) return;
	const key =
		process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
		process.env.MEDUSA_PUBLISHABLE_KEY;
	if (key && !headers.has("x-publishable-api-key")) {
		headers.set("x-publishable-api-key", key);
	}
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
	const firstSegment = pathSegments[0] ?? "";
	if (!ALLOWED_FIRST_SEGMENT.has(firstSegment)) {
		return NextResponse.json(
			{ message: "Segment nieobsługiwany przez proxy." },
			{ status: 404 },
		);
	}

	const path = pathSegments.join("/");
	const base = (await resolveMedusaBackendUrl()).replace(/\/$/, "");
	const url = `${base}/${path}${req.nextUrl.search}`;

	const headers = filterRequestHeaders(req);
	ensureStorePublishableKey(headers, path);

	const init: RequestInit = {
		method: req.method,
		headers,
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
	};

	if (req.method !== "GET" && req.method !== "HEAD") {
		const buf = await req.arrayBuffer();
		if (buf.byteLength > 0) {
			init.body = buf;
		}
	}

	try {
		const res = await fetch(url, init);
		const body = await res.arrayBuffer();
		return new NextResponse(body, {
			status: res.status,
			statusText: res.statusText,
			headers: filterResponseHeaders(res.headers),
		});
	} catch (e) {
		const isAbort =
			(e as { name?: string }).name === "TimeoutError" ||
			(e as { name?: string }).name === "AbortError";
		return NextResponse.json(
			{
				message: isAbort
					? "Medusa nie odpowiedziała w wymaganym czasie. Spróbuj ponownie."
					: "Nie udało się połączyć z Medusą.",
			},
			{ status: 504 },
		);
	}
}

type Ctx = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
	const { path = [] } = await ctx.params;
	return proxy(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
