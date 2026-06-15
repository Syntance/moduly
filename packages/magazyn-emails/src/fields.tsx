"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { useId } from "react";
import { CheckboxInput } from "@moduly/ui";
import { Input } from "@moduly/ui";
import { cn } from "@moduly/ui";
import type { TextAlign } from "./template-types";
import { colorSwatchInput, segmentItem, segmentItemActive, segmentItemIdle, segmentTrack } from "./editor-chrome";
import "./email-editor.css";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
	return (
		<label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
			{children}
		</label>
	);
}

export function TextField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-1.5">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input id={id} value={value} placeholder={placeholder} onChange={(e) => { onChange(e.target.value); }} className="h-9" />
		</div>
	);
}

export function TextAreaField({
	label,
	value,
	onChange,
	rows = 4,
	hint,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;
	hint?: string;
}) {
	const id = useId();

	return (
		<div className="flex flex-col gap-1.5">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<textarea
				id={id}
				value={value}
				rows={rows}
				onChange={(e) => { onChange(e.target.value); }}
				className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
			/>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

export function NumberField({
	label,
	value,
	onChange,
	min,
	max,
	step = 1,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-1.5">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				type="number"
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(e) => {
					const n = Number(e.target.value);
					if (!Number.isNaN(n)) onChange(n);
				}}
				className="h-9"
			/>
		</div>
	);
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function ColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = useId();
	const safe = HEX_RE.test(value) ? value : "#000000";
	return (
		<div className="flex flex-col gap-1.5">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<div className="flex items-center gap-2">
				<input
					type="color"
					aria-label={`${label} — wybór koloru`}
					value={safe}
					onChange={(e) => { onChange(e.target.value); }}
					className={colorSwatchInput}
				/>
				<Input id={id} value={value} onChange={(e) => { onChange(e.target.value); }} placeholder="#2a1f14" className="h-9 font-mono text-xs" />
			</div>
		</div>
	);
}

export function ToggleField({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
			<span className="font-medium text-foreground">{label}</span>
			<CheckboxInput checked={checked} onChange={onChange} aria-label={label} />
		</label>
	);
}

export function SelectField<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: Array<{ value: T; label: string }>;
	onChange: (value: T) => void;
}) {
	const id = useId();
	return (
		<div className="flex flex-col gap-1.5">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<select
				id={id}
				value={value}
				onChange={(e) => { onChange(e.target.value as T); }}
				className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}

const ALIGN_OPTIONS: Array<{ value: TextAlign; icon: typeof AlignLeft; label: string }> = [
	{ value: "left", icon: AlignLeft, label: "Do lewej" },
	{ value: "center", icon: AlignCenter, label: "Wyśrodkuj" },
	{ value: "right", icon: AlignRight, label: "Do prawej" },
];

export function AlignField({
	value,
	onChange,
}: {
	value: TextAlign;
	onChange: (value: TextAlign) => void;
}) {
	return (
		<fieldset className="flex flex-col gap-1.5 border-0 p-0">
			<legend className="mb-1.5 text-sm font-medium text-foreground">Wyrównanie</legend>
			<div className={cn(segmentTrack, "w-fit")}>
				{ALIGN_OPTIONS.map(({ value: v, icon: Icon, label }) => (
					<button
						key={v}
						type="button"
						aria-label={label}
						aria-pressed={value === v}
						onClick={() => { onChange(v); }}
						className={cn(
							"inline-flex size-8 items-center justify-center",
							segmentItem,
							value === v ? segmentItemActive : segmentItemIdle,
						)}
					>
						<Icon className="size-4" aria-hidden />
					</button>
				))}
			</div>
		</fieldset>
	);
}
