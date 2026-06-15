"use client";

import { Check } from "lucide-react";
import { cn } from "../lib/cn";

type Props = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	id?: string;
	"aria-label"?: string;
	className?: string;
};

/**
 * Checkbox z jasnym tłem w stanie nieaktywnym i wyraźnym znacznikiem aktywnym.
 * Natywny input ukryty wizualnie, ale obecny dla a11y i formularzy.
 */
export function CheckboxInput({ checked, onChange, id, className, ...aria }: Props) {
	return (
		<span className={cn("relative inline-flex size-4 shrink-0", className)}>
			<input
				id={id}
				type="checkbox"
				checked={checked}
				onChange={(e) => { onChange(e.target.checked); }}
				aria-label={aria["aria-label"]}
				className="peer absolute inset-0 size-full cursor-pointer opacity-0"
			/>
			<span
				aria-hidden
				className={cn(
					"pointer-events-none grid size-4 place-items-center rounded-[5px] border transition-colors",
					checked
						? "border-primary bg-primary text-primary-foreground"
						: "border-input bg-background",
					"peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
				)}
			>
				{checked ? <Check className="size-3" strokeWidth={3} /> : null}
			</span>
		</span>
	);
}
