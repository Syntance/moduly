import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "../primitives/button";

export type SidebarFooterProps = {
	storefrontUrl: string;
	/** Server Action lub handler formularza wylogowania. Gdy brak — przycisk ukryty. */
	logoutAction?: () => void | Promise<void>;
};

export function SidebarFooter({ storefrontUrl, logoutAction }: SidebarFooterProps) {
	return (
		<div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
			<Link
				href={storefrontUrl}
				className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg px-3 text-sm font-medium transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<ExternalLink className="size-4" aria-hidden />
				Otwórz sklep
			</Link>
			{logoutAction ? (
				<form action={logoutAction}>
					<Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
						<LogOut className="size-4" aria-hidden />
						Wyloguj
					</Button>
				</form>
			) : null}
		</div>
	);
}
