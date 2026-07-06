import { NextRequest, NextResponse } from "next/server";
import { resolveMedusaBackendUrl } from "@/lib/medusa/resolve-backend-url";

/**
 * Proxy Store API → Medusa (ten sam origin w przeglądarce, bez CORS).
 * Rewrite w next.config do zewnętrznego hosta w dev (Turbopack) potrafi
 * zwracać 500 przy POST — jawny fetch jest stabilniejszy.
 */

/**
 * Vercel: dłuższy cold start Railway / Medusa — unikaj przedwczesnego 504.
 * 60 s zostawia nam wystarczający margines nawet dla najgorszego przypadku
 * cold-startu Railway (workflow-engine-redis + pricing module + workerów),
 * a warm-path mieści się w <2 s, więc realnie nigdy nie dobijamy limitu.
 */
export const maxDuration = 60;
/**
 * Node runtime — Edge nie obsługuje części nagłówków + 4.5MB body limit,
 * a mamy POST-y z większymi payloadami (completeCart z line items).
 */
export const runtime = "nodejs";
/**
 * Railway backend siedzi w EU. Vercel domyślnie rozstawia funkcje globalnie,
 * co dawało +150–400 ms na każdym hopie US ↔ EU. Przypinamy funkcję do
 * Frankfurt — proxy leci EU → EU. Przy 5–8 requestach checkoutu to realnie
 * 1–2 s oszczędności end-to-end.
 */
export const preferredRegion = ["fra1"];
/** Proxy nie może być cache'owany ani prerenderowany — zawsze świeży request. */
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

/** Node fetch dekompresuje gzip, ale zostawia nagłówek — przeglądarka wtedy psuje body. */
const STRIP_RESPONSE_HEADERS = new Set([
  ...HOP_BY_HOP,
  "content-encoding",
]);

function filterResponseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  upstream.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  return out;
}

/**
 * Whitelist pierwszego segmentu ścieżki. Bez tego proxy jest otwartą bramą
 * do Medusy (w tym `/admin`), a w razie wycieku URL-a w HTML każdy request
 * wychodzi poza host. `custom` = nasze `/store/custom/*` endpointy.
 */
const ALLOWED_FIRST_SEGMENT = new Set(["store", "auth", "custom"]);

/**
 * Timeout upstream Medusy. Warm-path wraca w <2 s dzięki workflow-engine-redis
 * i locking-redis, ale pierwszy request po dłuższej ciszy potrafi cold-startować
 * lazy workflow engine i iść ~30–40 s (obserwowane na Railway). Ustawiamy 55 s
 * (pod limitem maxDuration=60 s) żeby nie przerywać realnych requestów, które
 * i tak są obronione przez warmup job.
 */
const UPSTREAM_TIMEOUT_MS = 55_000;

function filterRequestHeaders(req: NextRequest): Headers {
  const h = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      h.set(key, value);
    }
  });
  return h;
}

function ensureStorePublishableKey(headers: Headers, path: string) {
  if (!path.startsWith("store/")) return;
  const key =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
    process.env.MEDUSA_PUBLISHABLE_KEY;
  if (key && !headers.has("x-publishable-api-key")) {
    headers.set("x-publishable-api-key", key);
  }
}

async function proxy(req: NextRequest, pathSegments: string[]) {
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

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const isAbort =
      (e as { name?: string }).name === "TimeoutError" ||
      (e as { name?: string }).name === "AbortError";
    console.error(
      `[proxy] ${req.method} /${path} — upstream ${isAbort ? "timeout" : "error"}`,
      e,
    );
    return NextResponse.json(
      {
        message: isAbort
          ? "Medusa nie odpowiedziała w wymaganym czasie. Spróbuj ponownie."
          : "Nie udało się połączyć z Medusą.",
      },
      { status: 504 },
    );
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    statusText: res.statusText,
    headers: filterResponseHeaders(res.headers),
  });
}

type Ctx = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
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
