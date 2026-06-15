"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@moduly/ui";

type Props = {
	basePath: string;
};

export function FormsSubnav({ basePath }: Props) {
	const pathname = usePathname();
	const base = `${basePath}/formularze`;
	const onSent = pathname.includes("/formularze/wyslane");

	return (
		<nav
			className="flex max-w-md gap-1 border-b border-border"
			aria-label="Sekcje formularzy"
		>
			<Link
				href={base}
				className={cn(
					"border-b-2 px-3 py-2 text-sm font-medium transition-colors",
					!onSent
						? "border-primary text-foreground"
						: "border-transparent text-muted-foreground hover:text-foreground",
				)}
			>
				Konfiguracja
			</Link>
			<Link
				href={`${base}/wyslane`}
				className={cn(
					"border-b-2 px-3 py-2 text-sm font-medium transition-colors",
					onSent
						? "border-primary text-foreground"
						: "border-transparent text-muted-foreground hover:text-foreground",
				)}
			>
				Wysłane
			</Link>
		</nav>
	);
}
