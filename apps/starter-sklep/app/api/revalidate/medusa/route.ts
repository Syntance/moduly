import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

const REVALIDATE_SECRET = process.env.MEDUSA_REVALIDATE_SECRET;

const DEFAULT_TAGS = [
	"medusa-products",
	"medusa-categories",
	"global-product-config",
	"moduly-content",
	"site-settings",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
	const secret = request.headers.get("x-webhook-secret");

	if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	let body: { tags?: string[] } = {};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		body = {};
	}

	const tags =
		Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : DEFAULT_TAGS;

	try {
		for (const tag of tags) {
			revalidateTag(tag, "max");
		}

		return NextResponse.json({
			revalidated: true,
			tags,
			now: Date.now(),
		});
	} catch {
		return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
	}
}
