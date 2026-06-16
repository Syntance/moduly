import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";

export type SidebarFooterProps = {
	storefrontUrl: string;
	/** Server Action lub handler formularza wylogowania. Gdy brak — przycisk ukryty. */
	logoutAction?: () => void | Promise<void>;
	className?: string;
};

export function SidebarFooter({ storefrontUrl, logoutAction, className }: SidebarFooterProps) {
	return (
		<div className={cn("flex flex-col gap-2 border-t border-border pt-4", className)}>
			<Link
				href={storefrontUrl}
				className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<ExternalLink className="size-4" aria-hidden />
				Otwórz sklep
			</Link>
			{logoutAction ? (
				<form action={logoutAction}>
					<Button type="submit" variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-muted-foreground">
						<LogOut className="size-4" aria-hidden />
						Wyloguj
					</Button>
				</form>
			) : null}
		</div>
	);
}
