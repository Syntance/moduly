"use client";

import { cn } from "../lib/cn";

type Props = {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	id?: string;
	disabled?: boolean;
	"aria-label"?: string;
	className?: string;
};

export function Switch({ checked, onCheckedChange, id, disabled, className, ...aria }: Props) {
	return (
		<button
			id={id}
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={aria["aria-label"]}
			disabled={disabled}
			onClick={() => { onCheckedChange(!checked); }}
			className={cn(
				"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none",
				"focus-visible:ring-3 focus-visible:ring-ring/50",
				checked ? "bg-primary" : "bg-input",
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform",
					checked ? "translate-x-4" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}
