import type { ReactNode } from "react";

export default function AccountLayout({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto max-w-3xl px-4 py-10">
			{children}
		</div>
	);
}
