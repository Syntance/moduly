import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteSettings } from "@moduly/cms";
import { buildMetadata } from "@moduly/cms/metadata";
import { Providers } from "@/components/providers/providers";
import { initModuly } from "@/lib/init";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

initModuly();

export async function generateMetadata(): Promise<Metadata> {
	const siteSettings = await getSiteSettings();
	return buildMetadata({
		siteSettings,
		siteUrl: getSiteUrl(),
		fallbackTitle: "Moduly Sklep",
		fallbackDescription: "Sklep internetowy zbudowany na Moduly.",
		path: "/",
	});
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="pl">
			<body className="min-h-screen antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
