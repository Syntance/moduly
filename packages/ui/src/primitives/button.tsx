import type * as React from "react";
import { cn } from "../lib/cn";

type Variant = "default" | "ghost" | "outline" | "destructive";
type Size = "sm" | "default" | "lg" | "icon";

const VARIANT: Record<Variant, string> = {
	default: "bg-primary text-primary-foreground hover:bg-primary/90",
	ghost: "hover:bg-muted hover:text-foreground",
	outline: "border border-border bg-card hover:bg-muted",
	destructive: "border border-destructive/30 text-destructive hover:bg-destructive/10",
};

const SIZE: Record<Size, string> = {
	sm: "h-8 px-3 text-sm",
	default: "h-9 px-4 text-sm",
	lg: "h-10 px-5 text-sm",
	icon: "size-9",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	size?: Size;
};

/** Lekki Button bez zewnętrznych zależności. Style oparte o zmienne motywu Tailwind. */
export function Button({
	className,
	variant = "default",
	size = "default",
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			data-slot="button"
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
				VARIANT[variant],
				SIZE[size],
				className,
			)}
			{...props}
		/>
	);
}
