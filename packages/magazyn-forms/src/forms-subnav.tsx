"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@moduly/ui";

type Props = {
	basePath: string;
};

export function FormsSubnav({ basePath }: Props) {
	const pathname = usePathname();
	const base = `${basePath}/panel/formularze`;
	const onReceived = pathname.includes("/formularze/otrzymane");

	return (
		<nav
			className="flex max-w-md gap-1 border-b border-border"
			aria-label="Sekcje formularzy"
		>
			<Link
				href={base}
				className={cn(
					"border-b-2 px-3 py-2 text-sm font-medium transition-colors",
					!onReceived
						? "border-primary text-foreground"
						: "border-transparent text-muted-foreground hover:text-foreground",
				)}
			>
				Konfiguracja
			</Link>
			<Link
				href={`${base}/otrzymane`}
				className={cn(
					"border-b-2 px-3 py-2 text-sm font-medium transition-colors",
					onReceived
						? "border-primary text-foreground"
						: "border-transparent text-muted-foreground hover:text-foreground",
				)}
			>
				Otrzymane
			</Link>
		</nav>
	);
}
