"use client";

import { Bold, ChevronDown, Italic } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@moduly/ui";
import { segmentItem, segmentItemIdle, segmentTrack } from "./editor-chrome";
import { sanitizeEmailInlineHtml, toEditorDisplayHtml } from "./sanitize-email-inline-html";

/** Rozmiary inline — nadpisują „Rozmiar (px)” bloku w mailu. */
const SIZE_OPTIONS: Array<{ value: string; label: string }> = [
	{ value: "10", label: "10 px" },
	{ value: "11", label: "11 px" },
	{ value: "12", label: "12 px" },
	{ value: "13", label: "13 px" },
	{ value: "14", label: "14 px" },
	{ value: "16", label: "16 px" },
	{ value: "18", label: "18 px" },
	{ value: "20", label: "20 px" },
	{ value: "22", label: "22 px" },
];

function FieldLabel({ id, children }: { id: string; children: string }) {
	return (
		<label id={id} className="text-sm font-medium text-foreground">
			{children}
		</label>
	);
}

function wrapRangeInSpan(
	range: Range,
	style: { fontWeight?: string; fontStyle?: string; fontSize?: string },
) {
	const span = document.createElement("span");
	if (style.fontWeight) span.style.fontWeight = style.fontWeight;
	if (style.fontStyle) span.style.fontStyle = style.fontStyle;
	if (style.fontSize) span.style.fontSize = `${style.fontSize}px`;

	try {
		range.surroundContents(span);
	} catch {
		const fragment = range.extractContents();
		span.appendChild(fragment);
		range.insertNode(span);
	}

	const selection = window.getSelection();
	if (!selection) return;
	selection.removeAllRanges();
	const newRange = document.createRange();
	newRange.selectNodeContents(span);
	newRange.collapse(false);
	selection.addRange(newRange);
}

function ToolbarMetricInput({
	label,
	value,
	min,
	max,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
}) {
	return (
		<label className="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-[10px] text-muted-foreground">
			<span className="whitespace-nowrap">{label}</span>
			<input
				type="number"
				min={min}
				max={max}
				value={value}
				aria-label={label}
				onChange={(e) => {
					const n = Number(e.target.value);
					if (!Number.isNaN(n)) onChange(n);
				}}
				className="h-7 w-11 rounded border border-input bg-background px-1 text-center text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
			/>
		</label>
	);
}

export function RichTextEditor({
	label,
	value,
	onChange,
	rows = 4,
	singleLine = false,
	placeholder,
	blockFontSize = 14,
	paddingY = 6,
	onBlockFontSizeChange,
	onPaddingYChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;
	singleLine?: boolean;
	placeholder?: string;
	blockFontSize?: number;
	paddingY?: number;
	onBlockFontSizeChange?: (fontSize: number) => void;
	onPaddingYChange?: (paddingY: number) => void;
}) {
	const labelId = useId();
	const editorId = useId();
	const editorRef = useRef<HTMLDivElement>(null);
	const sizeMenuRef = useRef<HTMLDivElement>(null);
	const savedRangeRef = useRef<Range | null>(null);
	const lastEmittedRef = useRef<string | undefined>(undefined);
	const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

	const emitChange = useCallback(() => {
		const el = editorRef.current;
		if (!el) return;
		const html = sanitizeEmailInlineHtml(el.innerHTML);
		lastEmittedRef.current = html;
		onChange(html);
	}, [onChange]);

	const saveSelection = useCallback(() => {
		const editor = editorRef.current;
		const selection = window.getSelection();
		if (!editor || !selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		if (!editor.contains(range.commonAncestorContainer)) return;
		savedRangeRef.current = range.cloneRange();
	}, []);

	const restoreSelection = useCallback(() => {
		const range = savedRangeRef.current;
		const selection = window.getSelection();
		if (!range || !selection) return;
		selection.removeAllRanges();
		selection.addRange(range);
	}, []);

	useEffect(() => {
		const el = editorRef.current;
		if (!el) return;

		const displayHtml = toEditorDisplayHtml(value);
		const sanitizedDisplay = sanitizeEmailInlineHtml(displayHtml);
		const sanitizedCurrent = sanitizeEmailInlineHtml(el.innerHTML);

		if (value === lastEmittedRef.current && sanitizedCurrent === sanitizedDisplay) return;

		lastEmittedRef.current = value;
		el.innerHTML = displayHtml;
	}, [value]);

	useEffect(() => {
		if (!sizeMenuOpen) return;

		const onPointerDown = (event: MouseEvent) => {
			const target = event.target as Node | null;
			if (sizeMenuRef.current?.contains(target)) return;
			setSizeMenuOpen(false);
		};

		document.addEventListener("mousedown", onPointerDown);
		return () => { document.removeEventListener("mousedown", onPointerDown); };
	}, [sizeMenuOpen]);

	const runCommand = (command: string) => {
		restoreSelection();
		editorRef.current?.focus();
		document.execCommand(command);
		emitChange();
	};

	const applyFontSize = (sizePx: string) => {
		const range = savedRangeRef.current;
		if (!range) return;

		editorRef.current?.focus();
		restoreSelection();
		wrapRangeInSpan(range, { fontSize: sizePx });
		emitChange();
		setSizeMenuOpen(false);
	};

	const openSizeMenu = () => {
		saveSelection();
		setSizeMenuOpen((open) => !open);
	};

	const minHeight = Math.max(2.5, rows * 1.5);

	return (
		<div className="flex flex-col gap-1.5">
			<FieldLabel id={labelId}>{label}</FieldLabel>

			<div
				className={cn(
					segmentTrack,
					"flex max-w-full flex-wrap items-center gap-0.5 overflow-x-auto rounded-md border border-input bg-muted/30 p-1",
					"[-webkit-overflow-scrolling:touch]",
				)}
				role="toolbar"
				aria-label="Formatowanie tekstu"
			>
				<button
					type="button"
					aria-label="Pogrubienie"
					title="Pogrubienie"
					onMouseDown={(e) => {
						e.preventDefault();
						saveSelection();
					}}
					onClick={() => { runCommand("bold"); }}
					className={cn(
						"inline-flex size-8 items-center justify-center",
						segmentItem,
						segmentItemIdle,
					)}
				>
					<Bold className="size-4" aria-hidden />
				</button>
				<button
					type="button"
					aria-label="Kursywa"
					title="Kursywa"
					onMouseDown={(e) => {
						e.preventDefault();
						saveSelection();
					}}
					onClick={() => { runCommand("italic"); }}
					className={cn(
						"inline-flex size-8 items-center justify-center",
						segmentItem,
						segmentItemIdle,
					)}
				>
					<Italic className="size-4" aria-hidden />
				</button>

				<div ref={sizeMenuRef} className="relative">
					<button
						type="button"
						aria-label="Rozmiar czcionki zaznaczenia"
						aria-expanded={sizeMenuOpen}
						aria-haspopup="listbox"
						title="Rozmiar zaznaczonego fragmentu"
						onMouseDown={(e) => {
							e.preventDefault();
							openSizeMenu();
						}}
						className={cn(
							"inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs",
							segmentItem,
							segmentItemIdle,
							sizeMenuOpen && "bg-muted text-foreground",
						)}
					>
						Fragment
						<ChevronDown className="size-3.5 opacity-70" aria-hidden />
					</button>
					{sizeMenuOpen ? (
						<ul
							role="listbox"
							className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[6.5rem] rounded-md border border-border bg-popover py-1 shadow-md"
						>
							{SIZE_OPTIONS.map((opt) => (
								<li key={opt.value} role="option">
									<button
										type="button"
										className="block w-full px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
										onMouseDown={(e) => { e.preventDefault(); }}
										onClick={() => { applyFontSize(opt.value); }}
									>
										{opt.label}
									</button>
								</li>
							))}
						</ul>
					) : null}
				</div>

				{onBlockFontSizeChange ? (
					<>
						<div className="mx-0.5 h-6 w-px bg-border" aria-hidden />
						<ToolbarMetricInput
							label="Blok px"
							value={blockFontSize}
							min={8}
							max={48}
							onChange={onBlockFontSizeChange}
						/>
					</>
				) : null}
				{onPaddingYChange ? (
					<ToolbarMetricInput
						label="Odstęp Y"
						value={paddingY}
						min={0}
						max={64}
						onChange={onPaddingYChange}
					/>
				) : null}
			</div>

			<div
				id={editorId}
				ref={editorRef}
				contentEditable
				role="textbox"
				aria-labelledby={labelId}
				aria-multiline={!singleLine}
				data-placeholder={placeholder}
				suppressContentEditableWarning
				onInput={emitChange}
				onBlur={emitChange}
				onKeyDown={(e) => {
					if (singleLine && e.key === "Enter") {
						e.preventDefault();
					}
				}}
				className={cn(
					"rich-text-editor w-full rounded-md border border-input bg-transparent px-3 py-2 shadow-xs outline-none",
					"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
					"empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
				)}
				style={{ minHeight: `${minHeight}rem`, fontSize: `${blockFontSize}px` }}
			/>

			<p className="text-xs text-muted-foreground">
				<strong>Rozmiar</strong> — zaznaczony fragment (nadpisuje blok). <strong>Blok px</strong> i{" "}
				<strong>Odstęp Y</strong> — cały blok.
			</p>
		</div>
	);
}
