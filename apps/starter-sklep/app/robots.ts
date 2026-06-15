import type { MetadataRoute } from "next";
import { defaultShopRobots } from "@moduly/seo-geo";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
	return defaultShopRobots(getSiteUrl());
}
